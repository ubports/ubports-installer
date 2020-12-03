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
const { heimdall } = require("../../deviceTools.js");

/**
 * heimdall actions plugin
 * @extends Plugin
 */
class HeimdallPlugin extends Plugin {
  /**
   * fastboot:flash action
   * @returns {Promise}
   */
  action__flash({ partitions }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Flashing firmware", true);
      this.event.emit(
        "user:write:under",
        "Flashing firmware partitions using heimdall"
      );
      return heimdall.flash(
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
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Waiting for device", true);
        this.event.emit("user:write:under", "Heimdall is scanning for devices");
      })
      .then(() => heimdall.wait())
      .then(() => null); // ensure null is returned
  }
}

module.exports = HeimdallPlugin;
