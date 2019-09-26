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
global.packageInfo = require('../package.json');

const path = require('path');
const url = require('url');
const events = require("events");
class event extends events {};

const pug = new electronPug();
const ipcMain = electron.ipcMain;
let mainWindow;

var mainEvent = new event();
global.mainEvent = mainEvent;

var utils = require('./utils.js');
global.utils = utils;
var fastboot = require('./fastboot.js');
var devices = require('./devices.js');
var adb = require('./adb.js');

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

global.packageInfo.isSnap = utils.isSnap();
utils.getUpdateAvailable((updateAvailable) => { global.packageInfo.updateAvailable = updateAvailable; });

//==============================================================================
// RENDERER SIGNAL HANDLING
//==============================================================================

ipcMain.on("user:device:select", (event, installProperties) => {
  global.installProperties = Object.assign(global.installProperties, installProperties);
  devices.install(installProperties);
});

ipcMain.on("password", (e, password) => {
  mainEvent.emit("password", password);
});

ipcMain.on("die", (exitCode) => {
  process.exit(exitCode);
});

ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});

ipcMain.on("error_ignored", () => {
  utils.log.debug("ERROR IGNORED");
});

ipcMain.on("createBugReport", (event, title) => {
  utils.createBugReport(title, global.installProperties, (body) => {
    electron.shell.openExternal("https://github.com/ubports/ubports-installer/issues/new?title="+title+"&body="+body);
  });
});

ipcMain.on("device:select", (event, device) => {
  global.installProperties.device = device;
  mainEvent.emit("device:select", device);
});

//==============================================================================
// RENDERER COMMUNICATION
//==============================================================================

mainEvent.on("user:password", () => {
  mainWindow.webContents.send("user:password");
});

mainEvent.on("user:password:wrong", () => {
  mainWindow.webContents.send("user:password:wrong");
});

mainEvent.on("user:error", (err) => {
  mainWindow.webContents.send("user:error", err);
});

mainEvent.on("bootstrap:flashing", () => {
  mainWindow.webContents.send("bootstrap:flashing");
});

mainEvent.on("system-image:start", () => {
  mainWindow.webContents.send("system-image:start");
});

mainEvent.on("download:start", () => {
  mainWindow.webContents.send("download:start");
});

mainEvent.on("adbpush:done", () => {
  mainWindow.webContents.send("adbpush:done");
});

mainEvent.on("adbpush:start", () => {
  mainWindow.webContents.send("adbpush:start");
});

mainEvent.on("user:connection-lost", (callback) => {
  mainWindow.webContents.send("user:connection-lost", callback);
});

mainEvent.on("user:low-power", () => {
  mainWindow.webContents.send("user:low-power");
});

mainEvent.on("restart", () => {
  global.installProperties.device = undefined;
  global.installProperties.channel = undefined;
  utils.log.debug("WINDOW RELOADED");
  mainWindow.reload();
});

mainEvent.on("user:oem-lock", (callback) => {
  mainWindow.webContents.send("user:oem-lock");
  ipcMain.once("user:oem-lock:ok", () => {
    devices.instructOemUnlock((err) => {
      if (err) {
        mainEvent.emit("user:error", err);
      } else {
        callback(true);
      }
    });
  });
});

mainEvent.on("user:reboot", (i) => {
  mainWindow.webContents.send("user:reboot", i);
});

mainEvent.on("adb:rebooted", () => {
  mainWindow.webContents.send("adb:rebooted");
});

mainEvent.on("reboot:done", () => {
  mainWindow.webContents.send("reboot:done");
});

mainEvent.on("user:write:next", (text, current, total) => {
  mainWindow.webContents.send("user:write:next", text, current, total);
});

mainEvent.on("user:write:start", (text, length) => {
  mainWindow.webContents.send("user:write:start", text, length);
});

mainEvent.on("user:write:progress", (length) => {
  mainWindow.webContents.send("user:write:progress", length);
});

mainEvent.on("user:write:done", () => {
  mainWindow.webContents.send("user:write:done");
  utils.log.info("All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!");
});

mainEvent.on("user:write:status", (status) => {
  mainWindow.webContents.send("user:write:status", status);
});

mainEvent.on("user:adb:ready", () => {
  mainWindow.webContents.send("user:adb:ready");
});

mainEvent.on("user:device-unsupported", (device) => {
  utils.log.warn("The device " + device + " is not supported!");
  mainWindow.webContents.send("user:device-unsupported", device);
});

mainEvent.on("device:select:data-ready", (output, device, channels, ubuntuCom, autoDetected, isLegacyAndroid) => {
  global.installProperties.device = device;
  mainWindow.webContents.send("device:select:data-ready", output, device, channels, ubuntuCom, autoDetected, isLegacyAndroid);
});

mainEvent.once("device:wait:data-ready", (deviceSelects) => {
  mainWindow.webContents.send("device:wait:data-ready", deviceSelects);
});

mainEvent.on("user:no-network", () => {
  mainWindow.webContents.send("user:no-network");
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

  mainWindow.webContents.on("did-finish-load", () => {
    adb.start(false, false, (err) => {
      mainEvent.emit("user:adb:ready");
      devices.waitForDevice();
    });
    devices.getDeviceSelects((out) => {
      mainEvent.emit("device:wait:data-ready", out)
    });
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.pug'),
    protocol: 'file:',
    slashes: true
  }));

  mainWindow.setMenu(null); // TODO set menu

  if (cli.debug) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

//==============================================================================
// FUNCTIONAL EVENT HANDLING
//==============================================================================

app.on('ready', createWindow);

app.on('uncaughtException', function (error) {
    console.log("CRAP!");
});

app.on('window-all-closed', function () {
  utils.log.info("Good bye!");
  adb.stop(() => {
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
