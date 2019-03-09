"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const cli = require("commander");
const electron = require('electron');
const electronPug = require('electron-pug');
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const path = require('path');
const url = require('url');
const adb = require("./adb");
const pug = new electronPug();
let mainWindow;

const package_info = require('../package.json');
const cli_mode = (cli.device ? true : false);

function createWindow () {
  mainWindow = new BrowserWindow({
    width: cli_mode ? 0 : (process.env.DEBUG ? 1600 : 800),
    height: cli_mode ? 0 : 600,
    show: !cli_mode,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer ("+package_info.version+")"
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.pug'),
    protocol: 'file:',
    slashes: true,
    query: {
      verbose: cli.verbose || false,
      device: cli.device || false,
      channel: cli.channel || false,
      bootstrap: cli.bootstrap || false
    }
  }));
  mainWindow.setMenu(null);

  if (process.env.DEBUG) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('uncaughtException', function (error) {
    console.log("CRAP!");
});

app.on('window-all-closed', function () {
  adb.stop(console.log);
  console.log("Good bye!");
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

cli
  .name(package_info.name)
  .version(package_info.version)
  .description(package_info.description)
  .option('-v, --verbose', "Enable verbose logging and debugging tools")
  .option('-d, --device <device>', 'Specify device-id (codename).')
  .option('-c, --channel <channel>', 'Specify channel. Overrides the recommended option for the device.')
  .option('-b, --bootstrap', "Flash boot and recovery from bootloader. Overrides the recommended option for the device.")
  .parse(process.argv);
