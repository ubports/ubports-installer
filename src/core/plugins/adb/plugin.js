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

const Plugin = require("../plugin.js");
const path = require("path");
const { adb } = require("../../../lib/deviceTools.js");
const mainEvent = require("../../../lib/mainEvent.js");

/**
 * adb plugin
 */
class AdbPlugin extends Plugin {
  /**
   * adb:format action
   * @returns {Promise}
   */
  action__format({ partition }) {
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
  action__sideload({ group, file }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", `Sideloading ${group}`, true);
      mainEvent.emit(
        "user:write:under",
        "Your new operating system is being installed..."
      );
      return adb
        .sideload(
          path.join(this.cachePath, this.props.config.codename, group, file),
          p => mainEvent.emit("user:write:progress", p * 100)
        )
        .then(() => mainEvent.emit("user:write:progress", 0));
    });
  }

  /**
   * adb:reboot action
   * @returns {Promise}
   */
  action__reboot({ to_state }) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting");
        mainEvent.emit("user:write:under", "Rebooting to " + to_state);
      })
      .then(() => adb.reboot(to_state));
  }

  /**
   * adb:reconnect action
   * Try re-connecting offline or unauthorized devices three times and resume step. Failing that, instruct the user to re-connect the device.
   * @returns {Promise}
   */
  action__reconnect() {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Reconnecting", true);
        mainEvent.emit("user:write:under", "Reconnecting to the device");
      })
      .then(() => adb.reconnect())
      .catch(() => adb.reconnect())
      .catch(() => adb.reconnect())
      .catch(
        () =>
          new Promise((resolve, reject) =>
            mainEvent.emit("user:connection-lost", () =>
              resolve(this.step(step, settings, user_actions, handlers))
            )
          )
      )
      .then(() => this.step(step, settings, user_actions, handlers));
  }

  /**
   * adb:wait action
   * @returns {Promise}
   */
  action__wait() {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Waiting for device", true);
        mainEvent.emit("user:write:under", "Adb is scanning for devices");
      })
      .then(() => adb.wait())
      .then(() => null); // ensure null is returned
  }
}

module.exports = AdbPlugin;
