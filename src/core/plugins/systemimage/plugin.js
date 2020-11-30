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
const SystemImageClient = require("./client.js");

/**
 * systemimage plugin
 * @extends Plugin
 */
class SystemimagePlugin extends Plugin {
  /**
   * @constructs Plugin
   * @param {Props} props properties
   * @param {String} cachePath cache path
   * @param {EventEmitter} event event
   * @param {Object} log logger
   */
  constructor(props, cachePath, event, log) {
    super(props, cachePath, event, log);
    this.client = new SystemImageClient(cachePath, log, event);
  }

  /**
   * install action
   * @returns {Promise}
   */
  action__install() {
    this.event.emit("user:write:progress", 0);
    this.event.emit("user:write:working", "particles");
    this.event.emit("user:write:status", "Downloading Ubuntu Touch", true);
    this.event.emit("user:write:under", "Checking local files");
    return this.client.installLatestVersion({
      device: this.props.config.codename,
      ...this.props.settings
    });
  }

  /**
   * channels remote_values
   * @returns {Promise<Array<Object>>}
   */
  remote_values__channels() {
    return this.client
      .getDeviceChannels("bacon") // FIXME put actual value here
      .then(channels =>
        channels
          .map(channel => ({
            value: channel,
            label: channel.replace("ubports-touch/", "")
          }))
          .reverse()
      );
  }
}

module.exports = SystemimagePlugin;
