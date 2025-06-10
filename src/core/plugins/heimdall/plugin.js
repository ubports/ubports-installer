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
const { Heimdall } = require("../../helpers/asarLibs.js").DeviceTools;

/**
 * heimdall actions plugin
 * @extends Plugin
 */
class HeimdallPlugin extends Plugin {
  /**
   * @constructs HeimdallPlugin
   * @param {Props} props properties
   * @param {String} cachePath cache path
   * @param {EventEmitter} event event
   * @param {Object} log logger
   */
  constructor(props, cachePath, event, log) {
    super(props, cachePath, event, log);
    this.heimdall = new Heimdall();
    ["exec", "spawn:start", "spawn:exit", "spawn:error"].forEach(event =>
      this.heimdall.on(event, r =>
        log.command(`${event}: ${JSON.stringify(r)}`)
      )
    );
  }

  /**
   * abort all running tasks
   * @returns {Promise}
   */
  abort() {
    return this.heimdall.abort();
  }

  /**
   * Initialize this plugin
   * @returns {Promise<Boolean>}
   */
  init() {
    // hasAccess is convenient, we're really just looking for anything that executes Heimdall and throws errors if it fails to execute.
    // A .version() would be just as useful in this case, but it doesn't exist.
    return this.heimdall
      .hasAccess()
      .then(() => true)
      .catch(error => {
        try {
          var errorJson = JSON.parse(error.message);
        } catch (e) {
          this.log.warn(`Heimdall returned a non-json error: ${error}`);
          throw error;
        }
        if (errorJson.error.code === 3221225781) {
          this.log.warn(
            "Heimdall is missing required DLLs: Is Microsoft Visual C++ 2012 x86 redistributable installed?"
          );
          this.event.emit("user:no-msvc2012x86");
          return false;
        } else {
          throw error;
        }
      });
  }

  /**
   * wait for a device
   * @virtual
   * @returns {Promise<String>}
   */
  wait() {
    return this.heimdall.wait().then(() => "Unknown");
  }

  /**
   * fastboot:flash action
   * @returns {Promise}
   */
  action__flash({ partitions }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "circuit");
      this.event.emit("user:write:status", "Flashing firmware", true);
      this.event.emit(
        "user:write:under",
        "Flashing firmware partitions using heimdall"
      );
      return this.heimdall.flash(
        partitions.map(file => ({
          ...file,
          file: path.join(
            this.cachePath,
            this.props.config.codename,
            file.group,
            file.file
          )
        }))
      );
    });
  }

  /**
   * heimdall:wait action
   * @returns {Promise}
   */
  action__wait() {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Waiting for device", true);
        this.event.emit("user:write:under", "Heimdall is scanning for devices");
      })
      .then(() => this.heimdall.wait())
      .then(() => null); // ensure null is returned
  }
}

module.exports = HeimdallPlugin;
