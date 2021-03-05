"use strict";

/*
 * Copyright (C) 2017-2021 UBports Foundation <info@ubports.com>
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
const { adb } = require("../../helpers/deviceTools.js");

/**
 * adb plugin
 */
class AdbPlugin extends Plugin {
  /**
   * initialize adb server
   * @returns {Promise}
   */
  init() {
    return adb.startServer();
  }

  /**
   * kill all running tasks
   * @returns {Promise}
   */
  kill() {
    return adb.kill();
  }

  /**
   * adb:format action
   * @returns {Promise}
   */
  action__format({ partition }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit(
        "user:write:status",
        "Preparing system for installation",
        true
      );
      this.event.emit("user:write:under", "Formatting " + partition);
      return adb.wait().then(() => adb.format(partition));
    });
  }

  /**
   * adb:sideload action
   * @returns {Promise}
   */
  action__sideload({ group, file }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", `Sideloading ${group}`, true);
      this.event.emit(
        "user:write:under",
        "Your new operating system is being installed..."
      );
      return adb
        .sideload(
          path.join(this.cachePath, this.props.config.codename, group, file),
          p => this.event.emit("user:write:progress", p * 100)
        )
        .then(() => this.event.emit("user:write:progress", 0));
    });
  }

  /**
   * adb:push action
   * @returns {Promise}
   */
  action__push({ group, files, dest }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", `Pushing ${group} files`, true);
      this.event.emit(
        "user:write:under",
        `Sending ${group} files to the device...`
      );
      return adb
        .push(
          files.map(file =>
            path.join(this.cachePath, this.props.config.codename, group, file)
          ),
          dest,
          p => this.event.emit("user:write:progress", p * 100)
        )
        .then(() => this.event.emit("user:write:progress", 0));
    });
  }

  /**
   * adb:reboot action
   * @returns {Promise}
   */
  action__reboot({ to_state }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Rebooting");
        this.event.emit("user:write:under", "Rebooting to " + to_state);
      })
      .then(() => adb.reboot(to_state));
  }

  /**
   * adb:reconnect action
   * Try re-connecting offline or unauthorized devices three times and resume step. Failing that, instruct the user to re-connect the device.
   * @returns {Promise}
   */
  action__reconnect() {
    const _event = this.event;
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Reconnecting", true);
        this.event.emit("user:write:under", "Reconnecting to the device");
      })
      .then(() => adb.reconnect())
      .catch(() => adb.reconnect())
      .catch(() => adb.reconnect())
      .catch(
        () =>
          new Promise((resolve, reject) =>
            _event.emit("user:connection-lost", () =>
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
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Waiting for device", true);
        this.event.emit("user:write:under", "Adb is scanning for devices");
      })
      .then(() => adb.wait())
      .then(() => null); // ensure null is returned
  }

  /**
   * adb:preparesystemimage action
   * @returns {Promise}
   */
  action__preparesystemimage() {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Preparing system image", true);
        this.event.emit("user:write:under", "Mounting partitions...");
      })
      .then(() => adb.shell("mount -a").catch(() => null))
      .then(() => this.event.emit("user:write:under", "Cleaning cache..."))
      .then(() => adb.wipeCache().catch(() => null))
      .then(() => this.event.emit("user:write:under", "Preparing recovery..."))
      .then(() => adb.shell("mkdir -p /cache/recovery"))
      .then(() => {
        this.log.debug("adb created /cache/recovery directory");
        adb
          .verifyPartitionType("data", "ext4")
          .then(isExt4 => {
            if (isExt4) this.log.debug("ext4 data partition ok");
            else this.log.warning("no ext4 data partition");
          })
          .catch(e => this.log.warn(e));
      })
      .then(() => null); // ensure null is returned
  }
}

module.exports = AdbPlugin;
