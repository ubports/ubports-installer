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
const electron = require("electron");
const electronPug = require("electron-pug");

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
global.packageInfo = require("../package.json");

const Adb = require("promise-android-tools").Adb;
const Fastboot = require("promise-android-tools").Fastboot;
const Api = require("ubports-api-node-module").Installer;

var winston = require("winston");
const path = require("path");
const url = require("url");
const events = require("events");
class event extends events {}

const pug = new electronPug();
const ipcMain = electron.ipcMain;
let mainWindow;

const mainEvent = new event();
global.mainEvent = mainEvent;

const utils = require("./utils.js");
global.utils = utils;
const devices = require("./devices.js");
const api = new Api({
  timeout: 7500,
  cachetime: 60000
});
global.api = api;
var adb = new Adb({
  exec: (args, callback) => {
    utils.execTool("adb", args, callback);
  },
  log: utils.log.debug
});
global.adb = adb;
var fastboot = new Fastboot({
  exec: (args, callback) => {
    utils.execTool("fastboot", args, callback);
  },
  log: utils.log.debug
});
global.fastboot = fastboot;

//==============================================================================
// PARSE COMMAND-LINE ARGUMENTS
//==============================================================================

cli
  .name(global.packageInfo.name)
  .description(
    global.packageInfo.description +
      "\nVersion: " +
      global.packageInfo.version +
      "\nPackage: " +
      (global.packageInfo.package || "source")
  )
  .option(
    "-d, --device <device>",
    "[experimental] Override detected device-id (codename)"
  )
  .option("-o, --operating-system <os>", "[experimental] what os to install")
  .option(
    '-s, --settings "<setting>: <value>[, ...]"',
    "Override install settings"
  )
  .option("-f, --file <file>", "Override the config by loading a file")
  .option("-c, --cli", "[experimental] Run without GUI", undefined, "false")
  .option("-v, --verbose", "Enable verbose logging", undefined, "false")
  .option("-V, --veryVerbose", "Log *everything*", undefined, "false")
  .option("-D, --debug", "Enable debugging tools", undefined, "true")
  .parse(process.argv);

if (cli.file) {
  global.installConfig = require(path.join(process.cwd(), cli.file));
}

global.installProperties = {
  device: global.installConfig ? global.installConfig.codename : cli.device,
  settings: cli.settings ? JSON.parse(cli.settings) : {}
};

// AW : For backup and recovery
global.Backup ={
  systemsize : 0,
  usersize : 0,
  TotalSize : 0,
  BackupList : [],
  BackupListNames : [],
  config : []
}

if (utils.isSnap()) {
  global.packageInfo.isSnap = utils.isSnap();
  global.packageInfo.package = "snap";
}

//==============================================================================
// WINSTOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOON!
//==============================================================================

winston.addColors({
  error: "red",
  warn: "yellow",
  info: "green",
  verbose: "blue",
  debug: "white",
  command: "grey"
});

global.logger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    verbose: 3,
    debug: 4,
    command: 5
  },
  transports: [
    new winston.transports.File({
      filename: path.join(utils.getUbuntuTouchDir(), "ubports-installer.log"),
      options: { flags: "w" },
      level: "command"
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: cli.veryVerbose ? "command" : cli.verbose ? "debug" : "info"
    })
  ]
});

//==============================================================================
// RENDERER SIGNAL HANDLING
//==============================================================================

// Exit process with optional non-zero exit code
ipcMain.on("die", exitCode => {
  process.exit(exitCode);
});

// AW : backup
ipcMain.on("backup", (event,installConfig) => {
  mainEvent.emit("backup", installConfig);
});
ipcMain.on("user:backup", () => {
  mainEvent.emit("user:backup");
});
ipcMain.on("user:backup:start", (event,BackupName) => {
  mainEvent.emit("user:backup:start", BackupName);
});

// AW : Restore a backup
ipcMain.on("restore", (event,installConfig) => {
  mainEvent.emit("restore", installConfig);
});
ipcMain.on("user:restore", () => {
  mainEvent.emit("user:restore");
});
ipcMain.on("user:restore:start", (event,BackupName) => {
  mainEvent.emit("user:restore:start", BackupName);
});

// AW : Common to backup and restore
ipcMain.on("user:backuprestore:done", (event,task) => {
  utils.log.info("Screen done called");
  mainEvent.emit("user:backuprestore:done", task);
});



// Restart the installer
ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});


// Begin install process
ipcMain.on("install", () => {
  utils.log.debug(
    "settings: " + JSON.stringify(global.installProperties.settings)
  );
  devices.install(
    global.installConfig.operating_systems[global.installProperties.osIndex]
      .steps
  );
});

// Submit a bug-report
ipcMain.on("createBugReport", (event, title) => {
  utils.sendBugReport(title);
});

// The user selected a device
ipcMain.on("device:selected", (event, device) => {
  adb.stopWaiting();
  mainEvent.emit("device", device);
});

// Error from the renderer process
ipcMain.on("renderer:error", (event, error) => {
  mainEvent.emit("user:error", error);
});

// The user selected an os
ipcMain.on("os:selected", (event, osIndex) => {
  global.installProperties.osIndex = osIndex;
  utils.log.debug(
    "os config: " +
      JSON.stringify(global.installConfig.operating_systems[osIndex])
  );
  mainEvent.emit(
    "user:configure",
    global.installConfig.operating_systems[osIndex]
  );
});

// The user selected an os
ipcMain.on("option", (event, targetVar, value) => {
  global.installProperties.settings[targetVar] = value;
});

//==============================================================================
// RENDERER COMMUNICATION
//==============================================================================

// Open the bugreporting tool
mainEvent.on("user:error", (error, restart, ignore) => {
  try {
    if (mainWindow) {
      mainWindow.webContents.send("user:error", error);
      ipcMain.once("user:error:reply", (e, reply) => {
        switch (reply) {
          case "ignore":
            utils.log.warn("error ignored");
            if (ignore) setTimeout(ignore, 500);
            break;
          case "restart":
            utils.log.warn("restart after error");
            if (restart) setTimeout(restart, 500);
            else mainEvent.emit("restart");
            break;
          case "bugreport":
            utils.sendBugReport(error);
            break;
          default:
            break;
        }
      });
    } else {
      process.exit(1);
    }
  } catch (e) {
    process.exit(1);
  }
});

// Connection to the device was lost
mainEvent.on("user:connection-lost", reconnect => {
  if (mainWindow) mainWindow.webContents.send("user:connection-lost");
  ipcMain.once("reconnect", () => {
    if (reconnect) setTimeout(reconnect, 500);
    else mainEvent.emit("restart");
  });
});

// The device battery is too low to install
mainEvent.on("user:low-power", () => {
  if (mainWindow) mainWindow.webContents.send("user:low-power");
});

// AW : Backup 
mainEvent.on("backup", (installConfig) => {
  devices.getUserSystemFileSize().then ( ()=>{
    utils.log.info(global.Backup.TotalSize);
    mainWindow.webContents.send("user:backup", global.Backup.TotalSize / (1024 * 1024), installConfig);
  }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("Unable to get device space " + e)} );
});

// AW : Backup/Restore finished 
mainEvent.on("user:backuprestore:done", (task) => {  
  if (mainWindow) mainWindow.webContents.send("user:backuprestore:done", task);
});

// AW : Backup Start (TO-DO : Move it to device.js ?)
mainEvent.on("user:backup:start", (BackupName) => {
  utils.log.warn("Starting Backup : "+BackupName);

  mainEvent.emit("user:write:working", "pull");
  mainEvent.emit("user:write:status", "Backuping your device, please wait [Step 1/3]", true);
  mainEvent.emit("user:write:under","Reboot into recovery ...");
  // Reboot into recovery
  adb.reboot("recovery").then(() => {
    utils.log.debug("booting into recovery");
    adb.waitForDevice().then(() => { 
        // Get device SN for later
        adb.getSerialno().then(stdout=>{global.Backup.deviceSN = stdout;utils.log.info("Device SN: "+global.Backup.deviceSN);}).catch(e=>utils.log.debug(e));

        // booted in recovery, checking partitions
        utils.log.info("Checking partition");
        mainEvent.emit("user:write:under","Device under recovery, checking partition");
        // Check partition and mount it if not already mounted (Meizu pro5)
        devices.mountPartToBackup(installConfig.codename).then(()=>{
                // Partition Ready to be backuped
                utils.log.info("Partition Mounted");
                global.mainEvent.emit("user:write:progress", 0);
                global.mainEvent.emit("user:write:speed", 0);
                mainEvent.emit("user:write:under","Backuping your device, please wait [Step 1/3]");
                mainEvent.emit("user:write:under" , "Backing up system-data");

                // Get the toolpath for adb, needed in the backup command line
                var toolsPath = utils.getToolPath();
                utils.log.debug("tool path :"+toolsPath);

                // Create the backup folder
                var BackupPath = utils.CreateBackupDir(BackupName);

                // Now Starting system backup
                adb.backup("data/system-data",path.join(BackupPath,BackupName+"_system.tar"),toolsPath,progress => {
                            global.mainEvent.emit("user:write:progress",progress);
                            //utils.log.warn("progress : "+progress);
                            }).then(() => {
                    mainEvent.emit("user:write:status", "Backuping your device, please wait [Step 2/3]", true);
                    mainEvent.emit("user:write:under" , "Backing up user-data");
                    global.mainEvent.emit("user:write:progress", 100);
                    utils.log.info("Backup user data...");
                    // And user-data backup
                    adb.backup("data/user-data",path.join(BackupPath,BackupName+"_user.tar"),toolsPath,progress => {
                                global.mainEvent.emit("user:write:progress",progress);
                                //utils.log.warn("progress : "+progress);
                                }).then(() => {
                        mainEvent.emit("user:write:status", "Backuping your device, please wait [Step 3/3]", true);
                        mainEvent.emit("user:write:under","Done !");
                        // Generate the backup descriptor
                        utils.generateBackupConfigFile( path.join(BackupPath,BackupName), global.installConfig.codename,global.Backup.deviceSN, 610, 12400 );
                        // Backup finished, rebooting
                        adb.reboot("system").then(() => {
                            mainEvent.emit("user:write:status", "Backup finished", false);
                            mainEvent.emit("user:backuprestore:done","backup");
                            utils.log.info("Backup Done");
                        }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("Fail to reboot device into OS " + e)}); // fin reboot device
                    }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("unable to backup user-data " + e)}); // fin backup user-data
                }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("Unable to backup system-data " + e)}); // Fin backup system-data
        }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("Unable to find partition to backup " + e)}) // fin mount device partition
    }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("no device " + e)} );// Fin recherche device
  }).catch(e => {utils.errorToUser(e, "backup");utils.log.warn("reboot fail " + e)} ); // Fin reboot recovery
});


// AW : Restore 
mainEvent.on("restore", (installConfig) => {
  utils.log.info("RSTORE");
  
  var BackPath = utils.getUbuntuTouchBackupDir();
  utils.getBackupContent ( BackPath ).then( (files)=>{
     global.Backup.BackupListNames = files;
     utils.log.info("backup selected : "+global.Backup.BackupListNames[0]);
     
     var i = 0;
     files.forEach(function (file) {
                      global.Backup.BackupList.push('<option name="' + i + '">' + file + "</option>");
                      i++;
                      utils.log.debug(file); 
                      global.Backup.BackupListNames.push(file);
                      });

     utils.log.info("backup list : "+global.Backup.BackupList);//global.Backup.config = 
     //utils.log.info(path.join(BackPath, global.Backup.BackupListNames[0],global.Backup.BackupListNames[0]+'_config.bkp'));
     global.Backup.config = utils.loadBackupConfig(path.join(BackPath, global.Backup.BackupListNames[0], global.Backup.BackupListNames[0]+'_config.bkp'));
     utils.log.info("Device loaded : "+global.Backup.config.devicetype);
     devices.getDeviceUsedSpaceForBackup().then ( res=>{global.backupsize=res;utils.log.warn(res);mainWindow.webContents.send("user:restore", global.backupsize, installConfig, global.Backup);});
   }).catch(e => {utils.log.warn(e)});
  

  
  
  //if (mainWindow) mainWindow.webContents.send("user:restore", global.backupsize, installConfig);
});

// AW : restore 
mainEvent.on("user:restore", (selectedBackup) => {
  //devices.getDeviceUsedSpaceForBackup().then ( res=>{global.backupsize=res;utils.log.warn(global.backupsize);});
  mainWindow.webContents.send("user:restore", global.backupsize, installConfig, global.Backup);
  utils.log.info("iCICI");  
//if (mainWindow) mainWindow.webContents.send("user:restore", global.backupsize);
});


// Restart the installer
mainEvent.on("restart", () => {
  global.installProperties = { settings: {} };
  global.installConfig = {};
  utils.log.debug("WINDOW RELOADED");
  mainWindow.reload();
});

// The device's bootloader is locked, prompt the user to unlock it
mainEvent.on("user:oem-lock", callback => {
  mainWindow.webContents.send("user:oem-lock");
  ipcMain.once("user:oem-lock:ok", () => {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Unlocking", true);
    mainEvent.emit(
      "user:write:under",
      "You might see a confirmation dialog on your device."
    );
    fastboot
      .oemUnlock()
      .then(() => {
        callback(true);
      })
      .catch(err => {
        mainEvent.emit("user:error", err);
      });
  });
});

// Request user_action
mainEvent.on("user:action", (action, callback) => {
  if (mainWindow) {
    mainWindow.webContents.send("user:action", action);
    if (action.button) {
      ipcMain.on("action:completed", callback);
    }
  }
});

// Control the progress bar
mainEvent.on("user:write:progress", progress => {
  if (mainWindow) mainWindow.webContents.send("user:write:progress", progress);
});

// Installation successfull
mainEvent.on("user:write:done", () => {
  if (mainWindow) mainWindow.webContents.send("user:write:done");
  if (mainWindow) mainWindow.webContents.send("user:write:speed");
  utils.log.info(
    "All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!"
  );
});

// Show working animation
mainEvent.on("user:write:working", animation => {
  if (mainWindow) mainWindow.webContents.send("user:write:working", animation);
});

// Set the top text in the footer
mainEvent.on("user:write:status", (status, waitDots) => {
  if (mainWindow)
    mainWindow.webContents.send("user:write:status", status, waitDots);
});

// Set the speed part of the footer
mainEvent.on("user:write:speed", speed => {
  if (mainWindow) mainWindow.webContents.send("user:write:speed", speed);
});

// Set the lower text in the footer
mainEvent.on("user:write:under", status => {
  if (mainWindow) mainWindow.webContents.send("user:write:under", status);
});

// Device is unsupported
mainEvent.on("user:device-unsupported", device => {
  utils.log.warn("The device " + device + " is not supported!");
  if (mainWindow)
    mainWindow.webContents.send("user:device-unsupported", device);
});

// Set the install configuration data
mainEvent.on("user:configure", osInstructs => {
  if (osInstructs.options) {
    // If there's something to configure, configure it!
    if (mainWindow) {
      devices
        .setRemoteValues(osInstructs)
        .then(osInstructs => {
          mainWindow.webContents.send("user:configure", osInstructs);
        })
        .catch(e => utils.errorToUser(e, "configure"));
    }
  } else {
    // If there's nothing to configure, don't configure anything
    devices.install(osInstructs.steps);
  }
});

mainEvent.on("device", device => {
  global.installProperties.device = device;
  function continueWithConfig() {
    mainWindow.webContents.send(
      "user:os",
      global.installConfig,
      devices.getOsSelects(global.installConfig.operating_systems)
    );
  }
  if (global.installConfig && global.installConfig.operating_systems) {
    // local config specified
    continueWithConfig();
  } else {
    // fetch remote config
    global.mainEvent.emit("user:write:working", "particles");
    global.mainEvent.emit("user:write:status", "Preparing installation", true);
    global.mainEvent.emit(
      "user:write:under",
      "Fetching installation instructions"
    );
    api
      .getDevice(device)
      .then(config => {
        global.installConfig = config;
        continueWithConfig();
      })
      .catch(() => {
        mainEvent.emit("user:device-unsupported", device);
      });
  }
});

// The user selected a device
mainEvent.on("device:detected", device => {
  utils.log.info("device detected: " + device);
  mainEvent.emit("device", device);
});

// Set localstorage item
mainEvent.on("localstorage:set", (item, value) => {
  if (mainWindow) mainWindow.webContents.send("localstorage:set", item, value);
});

// Set localstorage item
mainEvent.on("user:no-network", () => {
  if (mainWindow) mainWindow.webContents.send("user:no-network");
});

//==============================================================================
// CREATE WINDOW
//==============================================================================

function createWindow() {
  utils.log.info(
    "Welcome to the UBports Installer version " +
      global.packageInfo.version +
      "!"
  );
  mainWindow = new BrowserWindow({
    width: cli.cli ? 0 : cli.debug ? 1600 : 800,
    height: cli.cli ? 0 : 600,
    show: !cli.cli,
    icon: path.join(__dirname, "../build/icons/icon.png"),
    title: "UBports Installer (" + global.packageInfo.version + ")"
  });

  // Tasks we need for every start
  mainWindow.webContents.on("did-finish-load", () => {
    adb
      .startServer()
      .then(() => {
        if (!global.installProperties.device) {
          devices.waitForDevice();
        }
      })
      .catch(e => {
        if (!e.includes("Killed"))
          utils.errorToUser(e, "Failed to start adb server");
      });
    api
      .getDeviceSelects()
      .then(out => {
        if (mainWindow)
          mainWindow.webContents.send("device:wait:device-selects-ready", out);
      })
      .catch(e => {
        utils.log.error("getDeviceSelects error: " + e);
        mainWindow.webContents.send("user:no-network");
      });
  });

  // Task we need only on the first start
  mainWindow.webContents.once("did-finish-load", () => {
    utils
      .getUpdateAvailable()
      .then(() => {
        utils.log.info(
          "This is not the latest version of the UBports Installer! Please update: https://devices.ubuntu-touch.io/installer/" +
            (global.packageInfo.package ? global.packageInfo.package : "")
        );
        mainWindow.webContents.send("user:update-available");
      })
      .catch(() => {}); // Ignore errors, since this is non-essential
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "html/index.pug"),
      protocol: "file:",
      slashes: true
    })
  );

  if (cli.debug) mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function() {
    mainWindow = null;
  });
}

//==============================================================================
// FUNCTIONAL EVENT HANDLING
//==============================================================================

app.on("ready", createWindow);

app.on("window-all-closed", function() {
  adb
    .killServer()
    .then(utils.killSubprocesses)
    .catch(utils.killSubprocesses);
  if (process.platform !== "darwin") {
    utils.log.info("Good bye!");
    setTimeout(() => {
      app.quit();
      process.exit(0);
    }, 2000);
  }
});

app.on("activate", function() {
  if (mainWindow === null) {
    createWindow();
  }
});

process.on("unhandledRejection", (reason, promise) => {
  if (mainWindow) {
    utils.errorToUser(reason, "unhandled rejection at " + promise);
  } else {
    utils.die(reason);
  }
});

process.on("uncaughtException", (error, origin) => {
  if (mainWindow) {
    utils.errorToUser(error, "uncaught exception at " + origin);
  } else {
    utils.die(error);
  }
});

// Set application menu
app.on("ready", function() {
  const menuTemplate = [
    {
      label: "About",
      submenu: [
        {
          label: "About the UBports Foundation...",
          click: () => electron.shell.openExternal("https://ubports.com")
        },
        {
          label: "About Ubuntu Touch...",
          click: () => electron.shell.openExternal("https://ubuntu-touch.io")
        },
        {
          label: "Donate",
          click: () => electron.shell.openExternal("https://ubports.com/donate")
        },
        {
          label: "Source",
          click: () =>
            electron.shell.openExternal(
              "https://github.com/ubports/ubports-installer/tree/" +
                global.packageInfo.version
            )
        },
        {
          label: "License",
          click: () =>
            electron.shell.openExternal(
              "https://github.com/ubports/ubports-installer/blob/" +
                global.packageInfo.version +
                "/LICENSE"
            )
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Report a bug",
          click: () => utils.sendBugReport("user-requested bug-report")
        },
        {
          label: "View issues",
          click: () =>
            electron.shell.openExternal(
              "https://github.com/ubports/ubports-installer/issues"
            )
        },
        {
          label: "Troubleshooting guide",
          click: () =>
            electron.shell.openExternal(
              "https://docs.ubports.com/en/latest/userguide/install.html#troubleshooting"
            )
        },
        {
          label: "UBports Forums",
          click: () => electron.shell.openExternal("https://forums.ubports.com")
        }
      ]
    },
    {
      label: "Window",
      role: "window",
      submenu: [
        {
          label: "Minimize",
          accelerator: "CmdOrCtrl+M",
          role: "minimize"
        },
        {
          label: "Close",
          accelerator: "CmdOrCtrl+W",
          role: "close"
        },
        {
          label: "Animations",
          submenu: [
            {
              label: "Enable",
              click: () =>
                mainEvent.emit("localstorage:set", "animationsDisabled", false)
            },
            {
              label: "Disable",
              click: () =>
                mainEvent.emit("localstorage:set", "animationsDisabled", true)
            }
          ]
        }
      ]
    }
  ];

  const menu = electron.Menu.buildFromTemplate(menuTemplate);
  electron.Menu.setApplicationMenu(menu);
});
