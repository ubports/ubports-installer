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

const axios = require("axios");
const packageInfo = require("../../package.json");

/**
 * UBports Installer version management
 * @property {String} updateUrl url to download the latest stable version of the current package
 */
class Updater {
  constructor() {
    this.cache = {};
    this.updateUrl = `https://devices.ubuntu-touch.io/installer/${
      packageInfo.package ? "?package=" + packageInfo.package : ""
    }`;
  }

  /**
   * resolves latest version of the UBports Installer
   * @returns {Promise<String>}
   */
  async getLatestVersion() {
    if (this.cache.latest) {
      return this.cache.latest;
    } else {
      return axios
        .get(
          "https://api.github.com/repos/ubports/ubports-installer/releases/latest",
          {
            json: true,
            headers: { "User-Agent": "axios" }
          }
        )
        .then(r => {
          this.cache.latest = r.data.tag_name;
          return r.data.tag_name;
        })
        .catch(e => {
          throw new Error(
            `Failed to get latest version of the UBports Installer: ${e}`
          );
        });
    }
  }

  /**
   * resolves update url if the installer is outdated, null otherwise
   * @returns {Promise<String>}
   */
  isOutdated() {
    return this.getLatestVersion().then(latest =>
      packageInfo.version < latest ? this.updateUrl : null
    );
  }

  /**
   * resolves update url if the installer is a prerelease, null otherwise
   * @returns {Promise<String>}
   */
  isPrerelease() {
    return this.getLatestVersion().then(latest =>
      packageInfo.version > latest ? this.updateUrl : null
    );
  }
}

module.exports = new Updater();
