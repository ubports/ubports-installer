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

const mainEvent = require("../../lib/mainEvent.js");
const systemImage = require("../../lib/system-image.js");

/**
 * systemimage plugin
 */
class SystemimagePlugin {
  constructor() {
    this.remote_values = {
      channels: () =>
        systemImage
          .getDeviceChannels(global.installConfig.codename)
          .then(channels =>
            channels
              .map(channel => ({
                value: channel,
                label: channel.replace("ubports-touch/", "")
              }))
              .reverse()
          )
    };
  }

  install() {
    mainEvent.emit("user:write:progress", 0);
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Downloading Ubuntu Touch", true);
    mainEvent.emit("user:write:under", "Checking local files");
    return systemImage.installLatestVersion(
      Object.assign(
        { device: global.installConfig.codename },
        global.installProperties.settings
      )
    );
  }
}

module.exports = new SystemimagePlugin();
