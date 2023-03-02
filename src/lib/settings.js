"use strict";

/*
 * Copyright (C) 2017-2022 UBports Foundation <info@ubports.com>
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

const { ipcMain } = require("electron");
const Store = require("electron-store");

/**
 * permanent UBports Installer settings
 */
const settings = new Store({
  options: {
    animations: {
      type: "boolean",
      default: true
    },
    never: {
      reportInstallationResult: {
        type: "boolean",
        default: false
      },
      udev: {
        type: "boolean",
        default: false
      },
      windowsDrivers: {
        type: "boolean",
        default: false
      }
    },
    systemimage: {
      showHiddenChannels: {
        type: "boolean",
        default: false
      }
    }
  }
});

// Get settings value
ipcMain.handle("getSettingsValue", (event, key) => {
  return settings.get(key);
});

// Set settings value
ipcMain.handle("setSettingsValue", (event, key, value) => {
  return settings.set(key, value);
});

module.exports = settings;
