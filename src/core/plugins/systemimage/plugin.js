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
    const showDevel = this.settings.get("systemimage.showDevelopmentReleases");
    const showEol = this.settings.get("systemimage.showEolReleases");
    const showHidden = this.settings.get("systemimage.showHiddenChannels");

    const [channels, metarelease] = await Promise.all([
      api.getChannels(this.props.config.codename),
      api.getMetarelease(),
    ]);

    let channelsParsed = channels.map(({ value, hidden }) => {
      const prettyStabilities = {
        "stable": "Stable",
        "rc": "Release candidate",
        "devel": "Development",
        "daily": "Daily builds",
      };

      let seriesIndex = metarelease.findIndex(
        ({ systemImageChannels }) => systemImageChannels[value]);

      if (seriesIndex == -1) {
        return { label: value, value, _hidden: hidden , _seriesIndex: seriesIndex };
      }

      let series = metarelease[seriesIndex];
      let stability = series.systemImageChannels[value].stability;

      // XXX: for 16.04, 20.04 consistency
      if (stability == "daily" && series.series.localeCompare("20.04") <= 0)
        stability = "devel";

      let label = `${series.series} ${prettyStabilities[stability] || stability}`;

      return {
        label, value,
        _hidden: hidden,
        _seriesIndex: seriesIndex,
        _stability: stability
      };
    });

    // Group channels by series
    const STABILITY_ORDER = ["stable", "rc", "daily", "devel"];

    let groups = [];
    for (let i = 0; i < metarelease.length; i++) {
      let grouped_values = channelsParsed
        // Hidden channels will be handled last
        .filter(({ _hidden, _seriesIndex }) => !_hidden && _seriesIndex == i)
        .sort((a, b) => {
          let aWeight = STABILITY_ORDER.indexOf(a._stability);
          if (aWeight == -1) aWeight = STABILITY_ORDER.length;

          let bWeight = STABILITY_ORDER.indexOf(b._stability);
          if (bWeight == -1) bWeight = STABILITY_ORDER.length;

          return aWeight - bWeight;
        });

      if (grouped_values.length > 0) {
        let labelSuffix =
            metarelease[i].supportStatus == "development" ? " (Development release)"
          : metarelease[i].supportStatus == "end-of-life" ? " (End-of-life)"
          : "";
          
        groups.push({
          label: `${metarelease[i].series}${labelSuffix}`,
          grouped_values,
          _seriesIndex: i,
        });
      }
    }

    // Now sort series by its support status, then by version.
    const SUPPORT_STATUS_ORDER = ["supported", "development", "end-of-life"];
    groups = groups.sort((a, b) => {
      let aSeries = metarelease[a._seriesIndex]
      let bSeries = metarelease[b._seriesIndex];

      if (aSeries.supportStatus != bSeries.supportStatus) {
        let aWeight = SUPPORT_STATUS_ORDER.indexOf(aSeries.supportStatus);
        if (aWeight == -1) aWeight = SUPPORT_STATUS_ORDER.length;

        let bWeight = SUPPORT_STATUS_ORDER.indexOf(bSeries.supportStatus);
        if (bWeight == -1) bWeight = SUPPORT_STATUS_ORDER.length;

        return aWeight - bWeight;
      }

      let versionCompare = aSeries.series.localeCompare(bSeries.series);
      // For development releases, sort older, closer-to-release releases first.
      // Otherwise sort newer releases first.
      if (aSeries.supportStatus == "development") {
        return versionCompare;
      } else {
        return -versionCompare;
      }
    });

    // Filter devel and EoL releases unless requested or no other releases
    // available.
    let seenSupported = false
    let seenDevel = false;
    groups = groups.filter((group) => {
      let { supportStatus } = metarelease[group._seriesIndex];
      if (supportStatus === "supported") {
        seenSupported = true;
        return true;
      } else if (supportStatus === "development") {
        if (seenSupported && !showDevel) {
          return false;
        } else {
          seenDevel = true;
          return true;
        }
      } else if (supportStatus == "end-of-life") {
        if ((seenSupported || seenDevel) && !showEol) {
          return false;
        } else {
          return true;
        }
      } else {
        // ???
        return true;
      }
    });

    // Mark the current release as such if it's a supported release.
    if (groups.length > 0) {
      let firstSeries = metarelease[groups[0]._seriesIndex];
      if (firstSeries.supportStatus == "supported") {
        groups[0].label += " (Current release)";
      }
    }

    // Finally, include hidden and ungroupped channels
    let others = channelsParsed.filter(
      ({ _hidden, _seriesIndex }) => (_hidden && showHidden) || _seriesIndex == -1);
    if (others.length > 0) {
      groups.push({
        label: "Others/hidden channels",
        grouped_values: others,
      });
    }

    return groups;
  }
}

module.exports = SystemimagePlugin;
