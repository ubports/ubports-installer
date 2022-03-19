"use strict";

/*
 * Copyright (C) 2022 Alexander Martinz <alexander@ubports.com>
 * Copyright (C) 2022 Caleb Connolly <caleb@connolly.tech>
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
const fs = require("fs");
const path = require("path");
const util = require("util");

const fsRename = util.promisify(fs.rename);

/**
 * postmarketOS plugin
 * @extends Plugin
 */
class PostmarketOSPlugin extends Plugin {
  /**
   * action download
   * @returns {Promise<Array<Object>>}
   */
  action__download() {
    return api
      .getImages(
        this.props.settings["release"],
        this.props.settings["interface"],
        this.props.config.codename
      )
      .then(files => [
        {
          actions: [
            {
              "core:download": {
                group: "postmarketOS",
                files
              }
            },
            {
              "core:unpack": {
                group: "postmarketOS",
                files: files.map(file => ({
                  ...file,
                  archive: file.name || path.basename(file.url)
                }))
              }
            },
            {
              "postmarketos:rename_unpacked_files": {
                group: "postmarketOS",
                files
              }
            }
          ]
        }
      ]);
  }

  /**
   * action rename_unpacked_files
   * @returns {Promise<void>}
   */
  async action__rename_unpacked_files({ group, files }) {
    this.event.emit("user:write:working", "squares");
    this.event.emit("user:write:status", "Preparing files", true);
    this.event.emit("user:write:under", "Preparing files");
    const basepath = path.join(
      this.cachePath,
      this.props.config.codename,
      group
    );
    files = files.map(file => ({
      ...file,
      path: path.join(basepath, file.name || path.basename(file.url))
    }));

    // Detect which image is which type, see: https://gitlab.com/postmarketOS/build.postmarketos.org/-/issues/113
    const rootfs_path = files
      .find(file => !file.path.endsWith("boot.img.xz"))
      .path.replace(/.xz$/, "");
    const boot_path = files
      .find(file => file.path.endsWith("boot.img.xz"))
      .path.replace(/.xz$/, "");
    return Promise.all([
      fsRename(rootfs_path, path.join(basepath, "rootfs.img")),
      fsRename(boot_path, path.join(basepath, "boot.img"))
    ]);
  }

  /**
   * interfaces remote_values
   * @returns {Promise<Array<Object>>}
   */
  remote_values__interfaces() {
    return api.getInterfaces(this.props.config.codename);
  }

  /**
   * releases remote_values
   * @returns {Promise<Array<Object>>}
   */
  remote_values__releases() {
    return api.getReleases(this.props.config.codename).then(releases =>
      releases.map(release => ({
        value: release,
        label: release
      }))
    );
  }
}

module.exports = PostmarketOSPlugin;
