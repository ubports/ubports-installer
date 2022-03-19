"use strict";

/*
 * Copyright (C) 2020-2021 UBports Foundation <info@ubports.com>
 * Copyright (c) 2022 Caleb Connolly <caleb@connolly.tech>
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

/** @module postmarketOS */

const baseURL = "https://images.postmarketos.org";

const api = axios.create({ baseURL, timeout: 15000 });

/**
 * get interfaces from api
 * @param {String} device device codename
 * @returns {Promise<Array<String>>} interfaces
 * @throws {Error} message "unsupported" if 404 not found
 */
const getInterfaces = device =>
  api
    .get("/bpo/index.json")
    .then(({ data }) => {
      const devices = data.releases.find(c => c.name === "edge").devices;
      const interfaces = devices
        .find(d => d.name.includes(device))
        .interfaces.map(i => i.name);
      return interfaces.map(i => {
        if (i === "phosh") return { value: i, label: "Phosh" };
        if (i === "plasma-mobile") return { value: i, label: "Plasma Mobile" };
        if (i === "sxmo-de-sway") return { value: i, label: "SXMO Sway" };
        return { value: i, label: i };
      });
    })
    .catch(error => {
      if (error?.response?.status === 404) throw new Error("404");
      throw error;
    });

/**
 * get images from api
 * @param {String} release release
 * @param {String} ui user interface
 * @param {String} device device codename
 * @returns {Promise<Array<Object>>} images array
 * @throws {Error} message "no network" if request failed
 */
const getImages = (release, ui, device) =>
  api
    .get("/bpo/index.json")
    .then(({ data }) => {
      const rel = data.releases.find(c => c.name === release);
      const dev = rel.devices.find(d => d.name.includes(device));
      const images = dev.interfaces.find(i => i.name === ui).images;
      // The first two are the latest rootfs and boot image
      const ts_latest = images[0].timestamp;
      return images
        .filter(i => i.timestamp === ts_latest)
        .map(i => ({
          url: i.url,
          checksum: {
            sum: i.sha256,
            algorithm: "sha256"
          }
        }));
    })
    .catch(error => {
      if (error?.response?.status === 404) throw new Error("404");
      throw error;
    });

/**
 * get releases from api
 * @param {String} device device codename
 * @returns {Promise<Array<String>>} releases
 * @throws {Error} message "unsupported" if 404 not found
 */
const getReleases = device =>
  api
    .get("/bpo/index.json")
    .then(({ data }) => {
      const releases = data.releases;
      return releases
        .filter(release => release.devices.find(d => d.name.includes(device)))
        .map(release => release.name);
    })
    .catch(error => {
      if (error?.response?.status === 404) throw new Error("404");
      throw error;
    });

module.exports = { getInterfaces, getImages, getReleases };
