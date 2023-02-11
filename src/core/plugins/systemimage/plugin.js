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

const SORT_ORDER = ["stable", "rc", "devel"];

/**
 * Gets a sorting weight for a channel
 * @param {String} channel the channel name
 * @returns {Number} channel weight for sorting
 */
function getChannelWeight(channel) {
  const parts = channel.split("/");
  return SORT_ORDER.indexOf(parts[parts.length - 1]);
}

/**
 * systemimage plugin
 * @extends Plugin
 */
class SystemimagePlugin extends Plugin {
  /**
   * systemimage:install action
   * @returns {Promise<Array<Object>>}
   */
  action__install(arg) {
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
            ...(arg?.verify_recovery
              ? [
                  {
                    "adb:assert_prop": {
                      prop: "ro.ubuntu.recovery",
                      value: "true"
                    }
                  }
                ]
              : []),
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
  async remote_values__channels() {
    const channels = await api.getChannels(this.props.config.codename);
    const sortedByStability = channels.sort((a, b) => {
      const weight = getChannelWeight(a.value) - getChannelWeight(b.value);
      if (weight !== 0) {
        return weight;
      }

      // if stability is the same, sort descending by version number
      const aVersion = parseFloat(a.value.split("/")[0]) || 0;
      const bVersion = parseFloat(b.value.split("/")[0]) || 0;
      return bVersion - aVersion;
    });
    const versionOrder = Array.from(
      new Set(sortedByStability.map(({ value }) => value.split("/")[0]))
    );
    // second sort to group the versions together and make sure the latest one with stable is on the top
    const sorted = channels.sort((a, b) => {
      const aVersion = a.value.split("/")[0];
      const bVersion = b.value.split("/")[0];

      return versionOrder.indexOf(aVersion) - versionOrder.indexOf(bVersion);
    });
    const visible = sorted
      .filter(({ value, hidden }) => !hidden && !value.endsWith("/edge"))
      .map(({ value, label }) => {
        if (value !== label) {
          return { value, label };
        }

        const split = value.split("/");
        return {
          label: `${split[0]}/${split[split.length - 1]}`,
          value
        };
      });
    const hidden = this.settings.get("systemimage.showHiddenChannels")
      ? sorted.filter(({ hidden }) => hidden)
      : [];

    return [
      ...visible.map(({ value, label }) => ({ value, label })),
      ...(hidden.length
        ? [{ label: "--- hidden channels ---", disabled: true }]
        : []),
      ...hidden.map(({ value, label }) => ({ value, label }))
    ];
  }
}

module.exports = SystemimagePlugin;
