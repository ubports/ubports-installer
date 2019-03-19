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
var ipcMain = require('electron').ipcMain;

const path = require('path');
const url = require('url');
const pug = new electronPug();
let mainWindow;

global.packageInfo = require('../package.json');

cli
  .name(global.packageInfo.name)
  .version(global.packageInfo.version)
  .description(global.packageInfo.description)
  .option('-d, --device <device>', '[experimental] Override detected device-id (codename)')
  .option('-c, --channel <channel>', '[experimental] Override the recommended release-channel for the device')
  .option('-C, --cli', "[experimental] Run without GUI", undefined, 'false')
  .option('-F, --force-fallback', "Use the android-tools packaged with the UBports Installer", undefined, 'false')
  .option('-n, --no-root', "Do not ask for the password and run fastboot without elevated privilleges", undefined, 'false')
  .option('-v, --verbose', "Enable verbose logging", undefined, 'false')
  .option('-D, --debug', "Enable debugging tools and verbose logging", undefined, 'false')
  .option('-s, --simulate', "[experimental] Run through every step except actually installing", undefined, 'false')
  .parse(process.argv);

global.installProperties = {
  device: cli.device,
  channel: cli.channel,
  cli: cli.cli,
  forceFallback: cli.forceFallback,
  noRoot: !cli.root,
  verbose: (cli.verbose || cli.debug),
  debug: cli.debug,
  simulate: cli.simulate
};

ipcMain.on( "setInstallProperties", ( event, installProperties ) => {
  global.installProperties = Object.assign(global.installProperties, installProperties);
});

ipcMain.on( "die", (exitCode) => {
  process.exit(exitCode);
});

function createWindow () {
  mainWindow = new BrowserWindow({
    width: cli.cli ? 0 : (cli.debug ? 1600 : 800),
    height: cli.cli ? 0 : 600,
    show: !cli.cli,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer ("+global.packageInfo.version+")"
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.pug'),
    protocol: 'file:',
    slashes: true
  }));
  mainWindow.setMenu(null);

  if (cli.debug) {
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
