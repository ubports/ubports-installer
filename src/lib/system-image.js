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

const { path: cachePath } = require("./cache.js");
const log = require("./log.js");
const { adb } = require("./deviceTools.js");

const { Client } = require("system-image-node-module");

/**
 * SystemImage client
 */
class SystemImageClient extends Client {
  constructor() {
    super({ path: cachePath });
  }

  /**
   * system image install
   * @param {Object} options system image options
   */
  installLatestVersion(options) {
    const _this = this;
    return Promise.all([
      _this
        .downloadLatestVersion(
          options,
          (progress, speed) => {
            mainEvent.emit("user:write:working", "download");
            mainEvent.emit("user:write:under", "Downloading");
            mainEvent.emit("user:write:progress", progress * 100);
            mainEvent.emit("user:write:speed", Math.round(speed * 100) / 100);
          },
          (current, total) => {
            if (current != total)
              log.debug(
                "Downloading system-image file " +
                  (current + 1) +
                  " of " +
                  total
              );
          }
        )
        .then(files => {
          mainEvent.emit("user:write:progress", 0);
          mainEvent.emit("user:write:speed", 0);
          mainEvent.emit("user:write:working", "particles");
          mainEvent.emit("user:write:status", "Preparing", true);
          mainEvent.emit("user:write:under", "Preparing system-image");
          return files;
        }),
      adb
        .wait()
        .then(() => adb.shell("mount -a").catch(() => null))
        .then(() => adb.wipeCache().catch(() => null))
        .then(() => adb.shell("mkdir -p /cache/recovery"))
        .then(() => {
          log.debug("adb created /cache/recovery directory");
          adb
            .verifyPartitionType("data", "ext4")
            .then(isExt4 => {
              if (isExt4) log.debug("ext4 data partition ok");
              else log.warning("no ext4 data partition");
            })
            .catch(e => log.warn(e));
        })
    ])
      .then(ret => {
        mainEvent.emit("user:write:working", "push");
        mainEvent.emit("user:write:status", "Sending", true);
        mainEvent.emit("user:write:under", "Sending files to the device");
        return ret[0]; // files from download promise
      })
      .then(files =>
        adb.push(
          files.map(f => f.src),
          files[0].dest,
          progress => {
            global.mainEvent.emit("user:write:progress", progress * 100);
          }
        )
      );
  }
}

module.exports = new SystemImageClient();
