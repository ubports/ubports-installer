"use strict";

/*
 * Copyright (C) 2020 UBports Foundation <info@ubports.com>
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

const log = require("./log.js");
const api = require("./api.js");
const window = require("./window.js");
const { ipcMain } = require("electron");
const EventEmitter = require("events");

const mainEvent = new EventEmitter();

// Restart the installer
ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});

// The user selected a device
ipcMain.on("device:selected", (event, device) => {
  log.info("device selected: " + device);
  mainEvent.emit("device", device);
});

// The user configured the installation
ipcMain.on("option", (event, targetVar, value) => {
  global.installProperties.settings[targetVar] = value;
});

// Error from the renderer process
ipcMain.on("renderer:error", (event, error) => {
  mainEvent.emit("user:error", error);
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
    window.send("user:prerequisites", global.installConfig, osIndex);
  }
});

// Open the bugreporting tool
mainEvent.on("user:error", (error, restart, ignore) => {
  try {
    if (window.getMain()) {
      window.send("user:error", error);
      ipcMain.once("user:error:reply", (e, reply) => {
        switch (reply) {
          case "ignore":
            log.warn("error ignored");
            if (ignore) setTimeout(ignore, 500);
            return;
          case "restart":
            log.warn("restart after error");
            if (restart) setTimeout(restart, 500);
            else mainEvent.emit("restart");
            return;
          case "bugreport":
            return window.send("user:report");
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

// The user selected a device
mainEvent.on("device:detected", device => {
  log.info("device detected: " + device);
  mainEvent.emit("device", device);
});

mainEvent.on("device", device => {
  global.installProperties.device = device;
  function continueWithConfig() {
    window.send(
      "user:os",
      global.installConfig,
      global.installConfig.operating_systems.map(
        (os, i) => `<option name="${i}">${os.name}</option>`
      )
    );
    if (global.installConfig.unlock.length) {
      window.send("user:unlock", global.installConfig);
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

// The device's bootloader is locked, prompt the user to unlock it
mainEvent.on("user:oem-lock", (enable = false, code_url, unlock) => {
  if (code_url) throw new Error("unlock code url not implemented yet");
  window.send("user:oem-lock", enable);
  ipcMain.once("user:oem-lock:ok", () => {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Unlocking", true);
    mainEvent.emit(
      "user:write:under",
      "You might see a confirmation dialog on your device."
    );
    unlock();
  });
});

// Request user_action
mainEvent.on("user:action", (action, callback) => {
  window.send("user:action", action);
  if (action.button) {
    ipcMain.once("action:completed", callback);
  }
});

// Request user_action
mainEvent.on("user:manual_download", (file, group, callback) => {
  window.send("user:manual_download", file, group);
  ipcMain.once("manual_download:completed", (e, path) => callback(path));
});

// Control the progress bar
mainEvent.on("user:write:progress", progress => {
  window.send("user:write:progress", progress);
});

// Installation successfull
mainEvent.on("user:write:done", () => {
  window.send("user:write:done");
  window.send("user:write:speed");
  log.info(
    "All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!"
  );
  if (!settings.get("never.opencuts")) {
    setTimeout(() => {
      window.send("user:report", true);
    }, 1500);
  }
});

// Show working animation
mainEvent.on("user:write:working", animation => {
  window.send("user:write:working", animation);
});

// Set the top text in the footer
mainEvent.on("user:write:status", (status, waitDots) => {
  window.send("user:write:status", status, waitDots);
});

// Set the speed part of the footer
mainEvent.on("user:write:speed", speed => {
  window.send("user:write:speed", speed);
});

// Set the lower text in the footer
mainEvent.on("user:write:under", status => {
  window.send("user:write:under", status);
});

// Device is unsupported
mainEvent.on("user:device-unsupported", device => {
  log.warn("The device " + device + " is not supported!");
  window.send("user:device-unsupported", device);
});

// No internet connection
mainEvent.on("user:no-network", () => {
  window.send("user:no-network");
});

// Connection to the device was lost
mainEvent.on("user:connection-lost", reconnect => {
  log.warn("lost connection to device");
  window.send("user:connection-lost");
  ipcMain.once("reconnect", () => {
    if (reconnect) setTimeout(reconnect, 500);
    else mainEvent.emit("restart");
  });
});

// The device battery is too low to install
mainEvent.on("user:low-power", () => {
  window.send("user:low-power");
});

module.exports = mainEvent;
