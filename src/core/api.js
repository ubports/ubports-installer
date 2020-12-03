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

/** @module api */

const api = axios.create({
  baseURL:
    "https://raw.githubusercontent.com/NeoTheThird/installer-config-experimental/main/", // FIXME replace with a permanent target
  timeout: 15000
});

/**
 * get device index
 * @returns {Promise<Array<Object>>}
 */
const getIndex = () => api.get("index.json").then(({ data }) => data);

/**
 * get device selects html
 * @returns {Promise<Array<String>>}
 */
const getDeviceSelects = () =>
  getIndex().then(devices =>
    devices.map(
      ({ name, codename }) => `<option name="${codename}">${name}</option>`
    )
  );

/**
 * get a device config
 * @param {String} codename device codename
 * @returns {Promise<Object>} config
 * @throws {Error} message "unsupported" if 404 not found
 */
const getDevice = codename =>
  api
    .get(`/devices/${codename}.json`)
    .then(({ data }) => data)
    .catch(error => {
      if (error.response.status === 404) throw new Error("unsupported");
      else throw error;
    });

/**
 * resolve an alias
 * @param {String} codename potential alias
 * @returns {Promise<String>} resolved codename
 */
const resolveAlias = codename =>
  api
    .get("/aliases.json")
    .then(({ data }) => (data[codename] ? data[codename][0] : codename));

module.exports = {
  getDeviceSelects,
  getDevice,
  resolveAlias
};
