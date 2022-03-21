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

const path = require("path");
const Plugin = require("../plugin.js");
const api = require("./api.js");

/**
 * systemimage plugin
 * @extends Plugin
 */
class SystemimagePlugin extends Plugin {
  /**
   * systemimage:install action
   * @returns {Promise<Array<Object>>}
   */
  action__install() {
    return api
      .getImages(
        this.props.settings.channel,
        this.props.config.codename,
        this.props.settings.wipe // TODO allow enabling developer mode and mtp https://github.com/ubports/android_bootable_recovery/blob/halium-7.1/system-image-upgrader#L352
      )
      .then(({ files, commands }) => [
        {
          actions: [
            {
              "core:download": {
                group: "Ubuntu Touch",
                files
              }
            },
            {
              "core:write": {
                content: commands,
                group: "Ubuntu Touch",
                file: "ubuntu_command"
              }
            },
            {
              "adb:wait": null
            },
            {
              "adb:preparesystemimage": null
            },
            {
              "adb:push": {
                group: "Ubuntu Touch",
                files: files
                  .map(f => path.basename(f.url))
                  .concat(["ubuntu_command"]),
                dest: "/cache/recovery/"
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
    return api
      .getChannels(this.props.config.codename)
      .then(channels => ({
        visible: channels.filter(({ hidden }) => !hidden).reverse(),
        hidden: this.settings.get("systemimage.showHiddenChannels")
          ? channels.filter(({ hidden }) => hidden)
          : []
      }))
      .then(({ visible, hidden }) => [
        ...visible.map(({ value, label }) => ({ value, label })),
        ...(hidden.length
          ? [{ label: "--- hidden channels ---", disabled: true }]
          : []),
        ...hidden.map(({ value, label }) => ({ value, label }))
      ]);
  }
}

module.exports = SystemimagePlugin;
