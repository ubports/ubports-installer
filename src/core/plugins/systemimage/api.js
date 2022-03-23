"use strict";

/*
 * Copyright (C) 2021-2022 UBports Foundation <info@ubports.com>
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
const path = require("path");

/** @module systemimage */

const baseURL = require("../../../lib/cli.js").systemimage;

const api = axios.create({ baseURL, timeout: 15000 });

const gpgFiles = [
  "image-signing.tar.xz",
  "image-signing.tar.xz.asc",
  "image-master.tar.xz",
  "image-master.tar.xz.asc"
];

/**
 * get images from api
 * @param {String} channel channel
 * @param {String} device device codename
 * @returns {Promise<Array<Object>>} images array
 * @throws {Error} message "no network" if request failed
 */
const getImages = (channel, device, wipe, enable = [], disable = []) =>
  api
    .get(`${channel}/${device}/index.json`)
    .catch(error => {
      if (error?.response?.status === 404) throw new Error("404");
      else throw new Error("no network");
    })
    .then(({ data }) => data.images.filter(({ type }) => type === "full").pop())
    .then(image => {
      if (image) return image;
      else throw new Error(`no image on channel ${channel}`);
    })
    .then(image => ({
      files: image.files
        .map(({ path, checksum, signature }) => [
          {
            url: `${baseURL}${path}`,
            checksum: {
              sum: checksum,
              algorithm: "sha256"
            }
          },
          {
            url: `${baseURL}${signature}`
          }
        ])
        .concat(gpgFiles.map(file => ({ url: `${baseURL}gpg/${file}` })))
        .flat(),
      commands: [
        "format system",
        "load_keyring image-master.tar.xz image-master.tar.xz.asc",
        "load_keyring image-signing.tar.xz image-signing.tar.xz.asc",
        "mount system",
        wipe ? "format data" : "",
        ...image.files.map(
          ({ path: file, signature }) =>
            `update ${path.basename(file)} ${path.basename(signature)}`
        ),
        ...enable.map(feature => `enable ${feature}`),
        ...disable.map(feature => `disable ${feature}`),
        "unmount system"
      ].join("\n")
    }));

/**
 * get channels from api
 * @param {String} device device codename
 * @returns {Promise<Array<String>>} channels
 * @throws {Error} message "unsupported" if 404 not found
 */
const getChannels = device =>
  api
    .get("channels.json")
    .then(({ data }) => Object.entries(data))
    .then(channels =>
      channels
        .filter(
          ([name, properties]) =>
            !(
              (
                !properties ||
                properties.redirect ||
                (properties.alias && properties.hidden) ||
                !properties.devices
              ) // remove invalid channels
            ) && properties.devices[device] // remove channels that don't serve this device
        )
        .map(([name, properties]) => ({
          value: name,
          label: name.replace("ubports-touch/", ""),
          hidden: properties.hidden || false
        }))
    );

module.exports = { getImages, getChannels };
