"use strict";

/*
 * Copyright (C) 2017-2020 UBports Foundation <info@ubports.com>
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
global.packageInfo = packageInfo;
const path = require("path");
const url = require("url");
const cli = require("./lib/cli.js");
const log = require("./lib/log.js");
const window = require("./lib/window.js");
const updater = require("./lib/updater.js");
const mainEvent = require("./lib/mainEvent.js");
const reporter = require("./lib/reporter.js");
const deviceTools = require("./lib/deviceTools.js");
const menuManager = require("./lib/menuManager.js");
const core = require("./core/core.js");

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
  deviceTools.kill();
  core.reset();
  mainWindow.reload();
});

async function createWindow() {
  log.info(
    "Welcome to the UBports Installer version " + packageInfo.version + "!"
  );
  mainWindow = new BrowserWindow({
    width: cli.debug ? 1600 : 800,
    height: 600,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer (" + packageInfo.version + ")",
    kiosk: false,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  // Tasks we need for every start and restart
  mainWindow.webContents.on("did-finish-load", () => {
    if (!core.props.config) {
      // FIXME implement core.detect()
      const wait = deviceTools.wait();
      ipcMain.once("device:selected", () => (wait ? wait.cancel() : null));
    }
    core.prepare();
  });

  // Task we need only on the first start
  mainWindow.webContents.once("did-finish-load", () => {
    updater
      .isOutdated()
      .then(updateUrl => {
        if (updateUrl) {
          log.warn(`Please update: ${updateUrl}`);
          window.send("user:update-available");
        }
      })
      .catch(e => log.debug(e)); // Ignore errors, since this is non-essential
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "html/index.html"),
      protocol: "file",
      slashes: true
    })
  );

  if (cli.debug) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function() {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function() {
  deviceTools.kill();
  log.info("Good bye!");
  setTimeout(() => {
    app.quit();
    process.exit(0);
  }, 2000);
});

app.on("activate", function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// Set application menu
app.on("ready", function() {
  menuManager.setMenu(mainWindow);
});
