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

const path = require("path");
const { adb } = require("../../lib/deviceTools.js");
const mainEvent = require("../../lib/mainEvent.js");

/**
 * adb plugin
 */
class AdbPlugin {
  /**
   * adb:format action
   * @returns {Promise}
   */
  format({ partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit(
        "user:write:status",
        "Preparing system for installation",
        true
      );
      mainEvent.emit("user:write:under", "Formatting " + partition);
      return adb.wait().then(() => adb.format(partition));
    });
  }

  /**
   * adb:sideload action
   * @returns {Promise}
   */
  sideload({ group, file }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", `Sideloading ${group}`, true);
      mainEvent.emit(
        "user:write:under",
        "Your new operating system is being installed..."
      );
      return adb
        .sideload(
          path.join(cachePath, global.installProperties.device, group, file),
          p => mainEvent.emit("user:write:progress", p * 100)
        )
        .then(() => mainEvent.emit("user:write:progress", 0));
    });
  }

  /**
   * adb:reboot action
   * @returns {Promise}
   */
  reboot({ to_state }) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting");
        mainEvent.emit("user:write:under", "Rebooting to " + to_state);
      })
      .then(() => adb.reboot(to_state));
  }

  /* TODO required by core:user_action
  wait() {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit(
      "user:write:status",
      "Waiting for device",
      true
    );
    mainEvent.emit(
      "user:write:under",
      "Adb is scanning for devices"
    );
    function adbWait() {
      return adb
        .hasAccess()
        .then(access => {
          if (access) resolve();
          else mainEvent.emit("user:connection-lost", adbWait);
        })
        .catch(e => {
          log.warn(e);
          resolve();
        });
    }
    return adbWait();
  }
  */
}

module.exports = new AdbPlugin();
