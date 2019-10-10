"use strict";

/*
 * Copyright (C) 2017-2019 UBports Foundation <info@ubports.com>
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

const cli = require("commander");
const electron = require('electron');
const electronPug = require('electron-pug');

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
global.packageInfo = require('../package.json');

const Adb = require('promise-android-tools').Adb;
const Fastboot = require('promise-android-tools').Fastboot;
const Api = require("../../ubports-api-node-module/src/module.js").Installer;

const exec = require('child_process').exec;
const path = require('path');
const url = require('url');
const events = require("events");
class event extends events {};

const pug = new electronPug();
const ipcMain = electron.ipcMain;
let mainWindow;

const mainEvent = new event();
global.mainEvent = mainEvent;

const utils = require('./utils.js');
global.utils = utils;
const devices = require('./devices.js');
const api = new Api();
global.api = api;
var adb = new Adb({
  exec: (args, callback) => { exec(
    [(path.join(utils.getUbuntuTouchDir(), 'platform-tools', 'adb'))].concat(args).join(" "),
    {options: {maxBuffer: 1024*1024*2}},
    callback
  ); }
});
global.adb = adb;
var fastboot = new Fastboot({
  exec: (args, callback) => { exec(
    [(path.join(utils.getUbuntuTouchDir(), 'platform-tools', 'fastboot'))].concat(args).join(" "),
    {options: {maxBuffer: 1024*1024*2}},
    callback
  ); }
});
global.fastboot = fastboot;

//==============================================================================
// PARSE COMMAND-LINE ARGUMENTS
//==============================================================================

cli
  .name(global.packageInfo.name)
  .version(global.packageInfo.version)
  .description(global.packageInfo.description)
  .option('-d, --device <device>', '[experimental] Override detected device-id (codename)')
  .option('-o, --operating-system <os>', '[experimental] what os to install')
  .option('-s, --settings "<setting>: <value>[, ...]"', '[experimental] Override install settings')
  .option('-f, --file <file>', '[experimental] Override the config by loading a file')
  .option('-c, --cli', "[experimental] Run without GUI", undefined, 'false')
  .option('-v, --verbose', "Enable verbose logging", undefined, 'false')
  .option('-D, --debug', "Enable debugging tools and verbose logging", undefined, 'false')
  .parse(process.argv);

if (cli.file) {
  global.installConfig = require(cli.file);
}

global.installProperties = {
  device: global.installConfig ? global.installConfig.codename : cli.device,
  cli: cli.cli,
  verbose: (cli.verbose || cli.debug),
  debug: cli.debug
};

global.packageInfo.isSnap = utils.isSnap();

utils.exportExecutablesFromPackage();

//==============================================================================
// RENDERER SIGNAL HANDLING
//==============================================================================

// Exit process with optional non-zero exit code
ipcMain.on("die", (exitCode) => {
  process.exit(exitCode);
});

// Restart the installer
ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});

// The user ignored an error
ipcMain.on("error_ignored", () => {
  utils.log.debug("ERROR IGNORED");
});

// Submit a bug-report
ipcMain.on("createBugReport", (event, title) => {
  utils.createBugReport(title, global.installProperties, (body) => {
    electron.shell.openExternal("https://github.com/ubports/ubports-installer/issues/new?title="+title+"&body="+body);
  });
});

// The user selected a device
ipcMain.on("device:selected", (event, device) => {
  adb.stopWaiting();
  global.installProperties.device = device;
  mainWindow.webContents.send("user:os", global.installConfig, devices.getOsSelects(global.installConfig.operating_systems));
});

// The user selected an os
ipcMain.on("os:selected", (event, osIndex) => {
  global.installProperties.osIndex = osIndex;
  utils.log.debug(global.installConfig.operating_systems[osIndex]);
  devices.install(global.installConfig.operating_systems[osIndex].steps);
});

//==============================================================================
// RENDERER COMMUNICATION
//==============================================================================

// Open the bugreporting tool
mainEvent.on("user:error", (err) => {
  try {
    if (mainWindow) mainWindow.webContents.send("user:error", err);
    else utils.die(err);
  } catch (e) {
    utils.log.error(e);
    process.exit(1);
  }
});

// Connection to the device was lost
mainEvent.on("user:connection-lost", (callback) => {
  if (mainWindow) mainWindow.webContents.send("user:connection-lost", callback);
});

// The device battery is too low to install
mainEvent.on("user:low-power", () => {
  if (mainWindow) mainWindow.webContents.send("user:low-power");
});

// Restart the installer
mainEvent.on("restart", () => {
  global.installProperties.device = undefined;
  global.installProperties.channel = undefined;
  utils.log.debug("WINDOW RELOADED");
  mainWindow.reload();
});

// The device's bootloader is locked, prompt the user to unlock it
mainEvent.on("user:oem-lock", (callback) => {
  mainWindow.webContents.send("user:oem-lock");
  ipcMain.once("user:oem-lock:ok", () => {
    fastboot.oemUnlock().then(() => {
      callback(true);
    }).catch((err) => {
      mainEvent.emit("user:error", err);
    });
  });
});

// Prompt the user to reboot
mainEvent.on("user:reboot", (i) => {
  if (mainWindow) mainWindow.webContents.send("user:reboot", i);
});

// Reboot complete, hide the reboot prompt
mainEvent.on("reboot:done", () => {
  if (mainWindow) mainWindow.webContents.send("reboot:done");
});

// Control the progress bar
mainEvent.on("user:write:progress", (progress) => {
  if (mainWindow) mainWindow.webContents.send("user:write:progress", progress);
});

// Installation successfull
mainEvent.on("user:write:done", () => {
  if (mainWindow) mainWindow.webContents.send("user:write:done");
  if (mainWindow) mainWindow.webContents.send("user:write:speed");
  utils.log.info("All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!");
});

// Show working animation
mainEvent.on("user:write:working", (animation) => {
  if (mainWindow) mainWindow.webContents.send("user:write:working", animation);
});

// Set the top text in the footer
mainEvent.on("user:write:status", (status, waitDots) => {
  if (mainWindow) mainWindow.webContents.send("user:write:status", status, waitDots);
});

// Set the speed part of the footer
mainEvent.on("user:write:speed", (speed) => {
  if (mainWindow) mainWindow.webContents.send("user:write:speed", speed);
});

// Set the lower text in the footer
mainEvent.on("user:write:under", (status) => {
  if (mainWindow) mainWindow.webContents.send("user:write:under", status);
});

// Device is unsupported
mainEvent.on("user:device-unsupported", (device) => {
  utils.log.warn("The device " + device + " is not supported!");
  if (mainWindow) mainWindow.webContents.send("user:device-unsupported", device);
});

// Set the install configuration data
mainEvent.on("user:configure", (output, device, channels, ubuntuCom, autoDetected, isLegacyAndroid) => {
  global.installProperties.device = device;
  if (mainWindow) mainWindow.webContents.send("user:configure", output, device, channels, ubuntuCom, autoDetected, isLegacyAndroid);
});

// The user selected a device
mainEvent.on("device:detected", (device) => {
  utils.log.info("device detected: " + device)
  global.installProperties.device = device;
  mainWindow.webContents.send("user:os", global.installConfig, devices.getOsSelects(global.installConfig.operating_systems));
});

//==============================================================================
// CREATE WINDOW
//==============================================================================

function createWindow () {
  utils.setLogLevel(global.installProperties.verbose ? "debug" : "info");
  utils.log.info("Welcome to the UBports Installer version " + global.packageInfo.version + "!");
  utils.log.info("This is " + (global.packageInfo.updateAvailable ? "not " : "") + "the latest stable version!");
  mainWindow = new BrowserWindow({
    width: cli.cli ? 0 : (cli.debug ? 1600 : 800),
    height: cli.cli ? 0 : 600,
    show: !cli.cli,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer ("+global.packageInfo.version+")"
  });

  // Tasks we need for every start
  mainWindow.webContents.on("did-finish-load", () => {
    adb.startServer().then(() => {
      devices.waitForDevice();
    }).catch(e => utils.errorToUser("Failed to start adb server: " + e));
    api.getDeviceSelects().then((out) => {
      mainWindow.webContents.send("device:wait:device-selects-ready", out);
    }).catch(e => {
      utils.log.error("getDeviceSelects error: " + e)
      mainWindow.webContents.send("user:no-network");
    });
  });

  // Task we need only on the first start
  mainWindow.webContents.once("did-finish-load", () => {
    utils.getUpdateAvailable().then(() => {
      utils.log.info("This is not the latest version of the UBports Installer! Please update: https://devices.ubuntu-touch.io/installer/" + (global.packageInfo.package ? global.packageInfo.package : ""));
      mainWindow.webContents.send("user:update-available");
    }).catch(() => {
      utils.log.debug("This is the latest version.")
    });
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.pug'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.setMenu(null); // TODO set menu

  if (cli.debug) mainWindow.webContents.openDevTools();

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

//==============================================================================
// FUNCTIONAL EVENT HANDLING
//==============================================================================

app.on('ready', createWindow);

app.on('window-all-closed', function () {
  utils.log.info("Good bye!");
  adb.killServer().then(() => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

process.on('unhandledRejection', (r) => {
  utils.log.error(r);
  if (mainWindow) utils.errorToUser(r);
  else utils.die(r);
});
