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

const { app, BrowserWindow, ipcMain, shell, Menu } = require("electron");
const path = require("path");
const fs = require("fs-extra");
const cache = require("./lib/cache.js");
cache.ensure();
const cli = require("./lib/cli.js");
const log = require("./lib/log.js");
log.setLevel(cli.verbose);
const updater = require("./lib/updater.js");
const udev = require("./lib/udev.js");
const packageInfo = require("../package.json");
global.packageInfo = packageInfo;

const settings = require("./lib/settings.js");
const url = require("url");

let mainWindow;

const mainEvent = require("./lib/mainEvent.js");

const reporter = require("./lib/reporter.js");
const errors = require("./lib/errors.js");
const devices = require("./devices.js");
const deviceTools = require("./lib/deviceTools.js");
const api = require("./lib/api.js");

if (cli.file) {
  try {
    global.installConfig = fs.readJsonSync(
      path.isAbsolute(cli.file) ? cli.file : path.join(process.cwd(), cli.file)
    );
  } catch (error) {
    throw new Error(`failed to read config file ${cli.file}: ${error}`);
  }
}

global.installProperties = {
  device: global.installConfig ? global.installConfig.codename : null,
  settings: {}
};

//==============================================================================
// RENDERER SIGNAL HANDLING
//==============================================================================

// Begin install process
ipcMain.on("install", () => {
  log.debug("settings: " + JSON.stringify(global.installProperties.settings));
  devices.install(
    global.installConfig.operating_systems[global.installProperties.osIndex]
      .steps
  );
});

// Submit a user-requested bug-report
ipcMain.on("reportResult", async (event, result, error) => {
  reporter.report(result, error, mainWindow);
});

// The user selected an os
ipcMain.on("os:selected", (event, osIndex) => {
  global.installProperties.osIndex = osIndex;
  log.debug(
    "os config: " +
      JSON.stringify(global.installConfig.operating_systems[osIndex])
  );
  mainEvent.emit(
    "user:configure",
    global.installConfig.operating_systems[osIndex]
  );
  if (global.installConfig.operating_systems[osIndex].prerequisites.length) {
    mainWindow.webContents.send(
      "user:prerequisites",
      global.installConfig,
      osIndex
    );
  }
});

// The user configured the installation
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
            log.warn("error ignored");
            if (ignore) setTimeout(ignore, 500);
            return;
          case "restart":
            log.warn("restart after error");
            deviceTools.kill();
            if (restart) setTimeout(restart, 500);
            else mainEvent.emit("restart");
            return;
          case "bugreport":
            return mainWindow.webContents.send("user:report");
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
  log.warn("lost connection to device");
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

// Restart the installer
mainEvent.on("restart", () => {
  global.installProperties = { settings: {} };
  global.installConfig = {};
  log.debug("WINDOW RELOADED");
  mainWindow.reload();
});

// The device's bootloader is locked, prompt the user to unlock it
mainEvent.on("user:oem-lock", (resume, enable = false) => {
  mainWindow.webContents.send("user:oem-lock", enable);
  ipcMain.once("user:oem-lock:ok", () => {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Unlocking", true);
    mainEvent.emit(
      "user:write:under",
      "You might see a confirmation dialog on your device."
    );
    deviceTools.fastboot
      .oemUnlock()
      .then(() => resume())
      .catch(err => {
        if (err.message.includes("enable unlocking")) {
          mainWindow.webContents.send("user:oem-lock", true);
        } else {
          mainEvent.emit("user:error", err);
        }
      });
  });
});

// Request user_action
mainEvent.on("user:action", (action, callback) => {
  if (mainWindow) {
    mainWindow.webContents.send("user:action", action);
    if (action.button) {
      ipcMain.once("action:completed", callback);
    }
  }
});

// Request user_action
mainEvent.on("user:manual_download", (file, group, callback) => {
  if (mainWindow) {
    mainWindow.webContents.send("user:manual_download", file, group);
    ipcMain.once("manual_download:completed", (e, path) => callback(path));
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
  log.info(
    "All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!"
  );
  if (!settings.get("never.opencuts")) {
    setTimeout(() => {
      mainWindow.webContents.send("user:report", true);
    }, 1500);
  }
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
  log.warn("The device " + device + " is not supported!");
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
        .catch(e => errors.toUser(e, "configure"));
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
      global.installConfig.operating_systems.map(
        (os, i) => `<option name="${i}">${os.name}</option>`
      )
    );
    if (global.installConfig.unlock.length) {
      mainWindow.webContents.send("user:unlock", global.installConfig);
    }
  }
  if (global.installConfig && global.installConfig.operating_systems) {
    // local config specified
    continueWithConfig();
  } else {
    // fetch remote config
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Preparing installation", true);
    mainEvent.emit("user:write:under", "Fetching configuration");
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

// No internet connection
mainEvent.on("user:no-network", () => {
  if (mainWindow) mainWindow.webContents.send("user:no-network");
});

//==============================================================================
// CREATE WINDOW
//==============================================================================

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
    if (!global.installProperties.device) {
      const wait = deviceTools.wait();
      ipcMain.once("device:selected", () => (wait ? wait.cancel() : null));
    }
    api
      .getDeviceSelects()
      .then(out => {
        if (mainWindow)
          mainWindow.webContents.send("device:wait:device-selects-ready", out);
      })
      .catch(e => {
        log.error("getDeviceSelects error: " + e);
        mainWindow.webContents.send("user:no-network");
      });
  });

  // Task we need only on the first start
  mainWindow.webContents.once("did-finish-load", () => {
    updater
      .isOutdated()
      .then(updateUrl => {
        if (updateUrl) {
          log.warn(`Please update: ${updateUrl}`);
          mainWindow.webContents.send("user:update-available");
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

//==============================================================================
// FUNCTIONAL EVENT HANDLING
//==============================================================================

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

process.on("unhandledRejection", (reason, promise) => {
  if (mainWindow) {
    errors.toUser(reason, "unhandled rejection at " + promise);
  } else {
    errors.die(reason);
  }
});

process.on("uncaughtException", (error, origin) => {
  if (mainWindow) {
    errors.toUser(error, "uncaught exception at " + origin);
  } else {
    errors.die(error);
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
          click: () => shell.openExternal("https://ubports.com")
        },
        {
          label: "About Ubuntu Touch...",
          click: () => shell.openExternal("https://ubuntu-touch.io")
        },
        {
          label: "Donate",
          click: () => shell.openExternal("https://ubports.com/donate")
        },
        {
          label: "Source",
          click: () =>
            shell.openExternal(
              "https://github.com/ubports/ubports-installer/tree/" +
                packageInfo.version
            )
        },
        {
          label: "License",
          click: () =>
            shell.openExternal(
              "https://github.com/ubports/ubports-installer/blob/" +
                packageInfo.version +
                "/LICENSE"
            )
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
          label: "Quit",
          accelerator: "CmdOrCtrl+Q",
          role: "close"
        }
      ]
    },
    {
      label: "Tools",
      submenu: [
        {
          label: "Set udev rules",
          click: udev.set,
          visible:
            packageInfo.package !== "snap" && process.platform === "linux"
        },
        {
          label: "Report a bug",
          click: () => mainWindow.webContents.send("user:report")
        },
        {
          label: "Developer tools",
          click: () => mainWindow.webContents.openDevTools()
        },
        {
          label: "Clean cached files",
          click: () => cache.clean()
        },
        {
          label: "Open settings config file",
          click: () => {
            settings.openInEditor();
          },
          visible: settings.size
        },
        {
          label: "Reset settings",
          click: () => {
            settings.clear();
          },
          visible: settings.size
        }
      ]
    },
    {
      label: "Settings",
      submenu: [
        {
          label: "Animations",
          checked: settings.get("animations"),
          type: "checkbox",
          click: () => {
            if (settings.get("animations")) {
              mainWindow.webContents.send("animations:hide");
            }
            settings.set("animations", !settings.get("animations"));
          }
        },
        {
          label: "Never ask for udev rules",
          checked: settings.get("never.udev"),
          visible:
            packageInfo.package !== "snap" && process.platform === "linux",
          type: "checkbox",
          click: () => settings.set("never.udev", !settings.get("never.udev"))
        },
        {
          label: "Never ask for windows drivers",
          checked: settings.get("never.windowsDrivers"),
          visible: process.platform === "win32",
          type: "checkbox",
          click: () =>
            settings.set(
              "never.windowsDrivers",
              !settings.get("never.windowsDrivers")
            )
        },
        {
          label: "Never ask for OPEN-CUTS automatic reporting",
          checked: settings.get("never.opencuts"),
          type: "checkbox",
          click: () =>
            settings.set("never.opencuts", !settings.get("never.opencuts"))
        },
        {
          label: "OPEN-CUTS API Token",
          click: () => reporter.tokenDialog(mainWindow)
        }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Bug tracker",
          click: () =>
            shell.openExternal(
              "https://github.com/ubports/ubports-installer/issues"
            )
        },
        {
          label: "Report a bug",
          click: () => mainWindow.webContents.send("user:report")
        },
        {
          label: "Troubleshooting",
          click: () =>
            shell.openExternal(
              "https://docs.ubports.com/en/latest/userguide/install.html#troubleshooting"
            )
        },
        {
          label: "UBports Forums",
          click: () => shell.openExternal("https://forums.ubports.com")
        },
        {
          label: "AskUbuntu",
          click: () =>
            shell.openExternal(
              "https://askubuntu.com/questions/tagged/ubuntu-touch"
            )
        },
        {
          label: "Telegram",
          click: () => shell.openExternal("https://t.me/WelcomePlus")
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
});
