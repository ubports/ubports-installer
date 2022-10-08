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

const axios = require("axios");

/** @module lineage_os */

const baseURL = "https://download.lineageos.org/api/v1/";
const deviceBuildTypeURL = `${baseURL}types/`;
const rootfsDefaultName = "lineageos_rootfs_";

const api = axios.create({ baseURL, timeout: 60000 });

/**
 * get latest build from the api TODO make it better
 * @param {String} channel channel
 * @param {String} device device codename
 * @returns {Promise<Array<Object>>} images array
 * @throws {Error} message "no network" if request failed
 */
const getLatestBuild = (channel, device) =>
  api
    .get(`${device}/${channel}/abc`)
    .then(({ data }) => {
      return [
        {
          url: data.response[data.response.length - 1].url,
          checksum: {
            sum: data.response[data.response.length - 1].id,
            algorithm: "sha256"
          },
          name: rootfsDefaultName + device + ".zip"
        }
      ];
    })
    .catch(error => {
      throw error;
    });

/**
 * get channels available for a device (usually always "nightly", but who knows)
 * @param {String} device device codename
 * @returns {Promise<Array<String>>} channels
 * @throws {Error} message "unsupported" if 404 not found
 */
const getChannels = device =>
  api
    .get(`${deviceBuildTypeURL}${device}`)
    .then(({ data }) => {
      return data.response;
    })
    .catch(error => {
      throw error;
    });

module.exports = { getLatestBuild, getChannels };
