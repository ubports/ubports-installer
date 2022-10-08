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

/** @module asteroid_os */

const baseURL = "https://release.asteroidos.org/";

const api = axios.create({ baseURL, timeout: 60000 });

/**
 * get images from api
 * @param {String} channel channel
 * @param {String} device device codename
 * @returns {Promise<Array<Object>>} images array
 * @throws {Error} message "no network" if request failed
 */
const getImages = (channel, device) =>
  api
    .get(`${channel}/${device}/MD5SUMS`)
    .then(({ data }) =>
      data
        .trim()
        .split("\n")
        .map(line => ({
          url: `${baseURL}${channel}/${device}/${line.split(/[ ,]+/)[1]}`,
          checksum: {
            sum: line.split(/[ ,]+/)[0],
            algorithm: "md5"
          }
        }))
    )
    .catch(error => {
      if (error.response.status === 404) throw new Error("404");
      else throw new Error("no network");
    });

/**
 * get channels from api
 * @param {String} device device codename
 * @returns {Promise<Array<String>>} channels
 * @throws {Error} message "unsupported" if 404 not found
 */
const getChannels = device =>
  Promise.all(
    ["1.0", "nightlies", "1.0-alpha"].map(channel =>
      getImages(channel, device)
        .then(() => channel)
        .catch(error => {
          if (error.message === "404") return null;
          else throw error;
        })
    )
  ).then(channels => channels.filter(c => c));

module.exports = { getImages, getChannels };
