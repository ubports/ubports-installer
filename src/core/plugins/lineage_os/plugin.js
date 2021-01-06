"use strict";

/*
 * Copyright (C) 2020-2021 UBports Foundation <info@ubports.com>
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
const api = require("./api.js");

/**
 * LineageOS plugin
 * @extends Plugin
 */
class LineageOSPlugin extends Plugin {
  /**
   * action download
   * @returns {Promise<Array<Object>>}
   */
  action__download() {
    return api
      .getLatestBuild(this.props.settings.channel, this.props.config.codename)
      .then(files => [
        {
          actions: [
            {
              "core:download": {
                group: "LineageOS",
                files
              }
            }
          ]
        }
      ]);
  }

  /**
   * channels remote_values
   * @returns {Promise<Array<Object>>}
   */
  remote_values__channels() {
    return api.getChannels(this.props.config.codename).then(channels =>
      channels.map(channel => ({
        value: channel,
        label: channel
      }))
    );
  }
}

module.exports = LineageOSPlugin;
