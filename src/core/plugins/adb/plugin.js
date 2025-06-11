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
const { Adb } = require("promise-android-tools");
const { buildPathForTools } = require("../../helpers/fileutil.js");

/**
 * adb plugin
 */
class AdbPlugin extends Plugin {
  /**
   * @constructs AdbPlugin
   * @param {Props} props properties
   * @param {String} cachePath cache path
   * @param {EventEmitter} event event
   * @param {Object} log logger
   */
  constructor(props, cachePath, event, log) {
    super(props, cachePath, event, log);
    this.adb = new Adb();
    ["exec", "spawn:start", "spawn:exit", "spawn:error"].forEach(event =>
      this.adb.on(event, r => log.command(`${event}: ${JSON.stringify(r)}`))
    );
  }

  /**
   * initialize adb server
   * @returns {Promise<Boolean>}
   */
  init() {
    return this.adb.startServer().then(() => true);
  }

  /**
   * kill all running tasks
   * @returns {Promise}
   */
  kill() {
    return this.adb.kill();
  }

  /**
   * wait for a device
   * @virtual
   * @returns {Promise<String>}
   */
  wait() {
    return this.adb.wait().then(() => this.adb.getDeviceName());
  }

  /**
   * adb:format action
   * @returns {Promise}
   */
  action__format({ partition }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit(
          "user:write:status",
          "Preparing system for installation",
          true
        );
        this.event.emit("user:write:under", "Formatting " + partition);
        return this.adb.wait();
      })
      .then(() => this.adb.format(partition))
      .then(() => null);
  }

  /**
   * adb:sideload action
   * @returns {Promise}
   */
  action__sideload({ group, file }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "circuit");
      this.event.emit("user:write:status", `Sideloading ${group}`, true);
      this.event.emit(
        "user:write:under",
        "Your new operating system is being installed..."
      );
      return this.adb
        .sideload(
          buildPathForTools(
            this.cachePath,
            this.props.config.codename,
            group,
            file
          ),
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
      this.event.emit("user:write:working", "push");
      this.event.emit("user:write:status", `Pushing ${group} files`, true);
      this.event.emit(
        "user:write:under",
        `Sending ${group} files to the device...`
      );
      return this.adb
        .push(
          files.map(file =>
            buildPathForTools(
              this.cachePath,
              this.props.config.codename,
              group,
              file
            )
          ),
          dest,
          p => this.event.emit("user:write:progress", p * 100)
        )
        .then(() => this.event.emit("user:write:progress", 0));
    });
  }

  /**
   * adb:shell action
   * @returns {Promise}
   */
  action__shell(args) {
    // TODO 0.10.0: deprecate option to call with an object
    return this.adb
      .shell(...(Array.isArray(args) ? args : args.args))
      .then(() => null); // ensure null is returned
  }

  /**
   * adb:reboot action
   * @returns {Promise}
   */
  action__reboot({ to_state }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Rebooting");
        this.event.emit("user:write:under", "Rebooting to " + to_state);
      })
      .then(() => this.adb.reboot(to_state));
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
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Reconnecting", true);
        this.event.emit("user:write:under", "Reconnecting to the device");
      })
      .then(() => this.adb.reconnect())
      .catch(() => this.adb.reconnect())
      .catch(() => this.adb.reconnect())
      .then(() => null) // ensure null is resolved
      .catch(
        () =>
          new Promise((resolve, reject) =>
            _event.emit("user:connection-lost", () =>
              resolve([{ actions: [{ "adb:reconnect": {} }] }])
            )
          )
      );
  }

  /**
   * adb:wait action
   * @returns {Promise}
   */
  action__wait() {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Waiting for device", true);
        this.event.emit("user:write:under", "Adb is scanning for devices");
      })
      .then(() => this.adb.wait())
      .then(() => null); // ensure null is returned
  }

  /**
   * adb:preparesystemimage action
   * @returns {Promise}
   */
  action__preparesystemimage() {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Preparing system image", true);
        this.event.emit("user:write:under", "Mounting partitions...");
      })
      .then(() => this.adb.shell("mount -a").catch(() => null))
      .then(() => this.event.emit("user:write:under", "Cleaning cache..."))
      .then(() => this.adb.wipeCache().catch(() => null))
      .then(() => this.event.emit("user:write:under", "Preparing recovery..."))
      .then(() => this.adb.shell("mkdir -p /cache/recovery"))
      .then(() => {
        this.log.debug("adb created /cache/recovery directory");
        this.adb
          .verifyPartitionType("data", "ext4")
          .then(isExt4 => {
            if (isExt4) this.log.debug("ext4 data partition ok");
            else this.log.warning("no ext4 data partition");
          })
          .catch(e => this.log.warn(e));
      })
      .then(() => null); // ensure null is returned
  }

  /**
   * adb:assert_prop action
   * @returns {Promise}
   */
  action__assert_prop({ prop, value: expectedValue, regex }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:under", `Asserting ${prop} property`);
      })
      .then(() => this.adb.getprop(prop))
      .then(actualValue => {
        if (
          !(regex
            ? actualValue.match(new RegExp(regex.pattern, regex.flags))
            : actualValue === expectedValue)
        )
          throw new Error(
            `Assertion error: expected property ${prop} to ${
              regex
                ? `match /${regex.pattern}/${regex.flags || ""}`
                : `be ${expectedValue}`
            } but got ${actualValue}`
          );
      });
  }
}

module.exports = AdbPlugin;
