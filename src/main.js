"use strict";

/*
 * Copyright (C) 2017-2021 UBports Foundation <info@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const { app, BrowserWindow, ipcMain } = require("electron");
const packageInfo = require("../package.json");
const path = require("path");
const url = require("url");
const cli = require("./lib/cli.js");
const log = require("./lib/log.js");
const updater = require("./lib/updater.js");
const mainEvent = require("./lib/mainEvent.js");
const reporter = require("./lib/reporter.js");
const menuManager = require("./lib/menuManager.js");
const core = require("./core/core.js");

// Enable live reload for Electron
if (process.env.ROLLUP_WATCH) {
  require("electron-reload")(path.resolve("./public"), {
    electron: require(`${__dirname}/../node_modules/electron`)
  });
}

let mainWindow;

// Submit a user-requested bug-report
// FIXME move after a better way to access mainWindow has been found
ipcMain.on("reportResult", async (event, result, error) => {
  reporter.report(result, error, mainWindow);
});

// Restart the installer
// FIXME move after a better way to access mainWindow has been found
mainEvent.on("restart", () => {
  log.info("UBports Installer restarting...");
  core.kill();
  mainWindow.reload();
});

async function createWindow() {
  log.info(
    "Welcome to the UBports Installer version " + packageInfo.version + "!"
  );
  mainWindow = new BrowserWindow({
    width: cli.debug ? 1400 : 1000,
    minWidth: 800,
    height: 750,
    minHeight: 600,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer (" + packageInfo.version + ")",
    kiosk: false,
    fullscreen: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true
    }
  });

  // Make sure links are opened in browser
  mainWindow.webContents.on('will-navigate', (e, url) => {
    // TODO replace all the shell.openExternal calls in the svelte code with href's
    if (url !== e.sender.getURL()) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  // Tasks we need for every start and restart
  mainWindow.webContents.on("did-finish-load", () => core.prepare(cli.file));

  // Task we need only on the first start
  mainWindow.webContents.once("did-finish-load", () => {
    updater
      .isOutdated()
      .then(updateUrl => {
        if (updateUrl) mainEvent.emit("user:update-available", updateUrl);
      })
      .catch(e => log.debug(e)); // Ignore errors, since this is non-essential
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "../public/index.html"),
      protocol: "file",
      slashes: true
    })
  );

  if (cli.debug) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  core.kill();
  log.info("Good bye!");
  setTimeout(() => {
    app.quit();
    process.exit(0);
  }, 2000);
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// Set application menu
app.on("ready", function () {
  menuManager.setMenu(mainWindow);
});
