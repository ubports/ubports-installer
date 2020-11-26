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

const mainEvent = require("../../lib/mainEvent.js");
const { download, checkFile } = require("progressive-downloader");
const { unpack } = require("../../lib/asarLibs.js");
const log = require("../../lib/log.js");
const { path: cachePath } = require("../../lib/cache.js");
const path = require("path");

/**
 * core plugin
 */
class CorePlugin {
  /**
   * core:group action
   * @param {Array} group array of steps
   * @returns {Promise}
   */
  group(group) {
    return Promise.resolve(group.length ? group : null);
  }

  /**
   * core:user_action action
   * @param {Object} action action
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @returns {Promise}
   */
  user_action({ action }, settings, user_actions) {
    return new Promise(function(resolve, reject) {
      mainEvent.emit("user:action", user_actions[action], () => {
        switch (action) {
          case "recovery":
          case "system":
            resolve([{ actions: [{ "adb:wait": null }] }]);
            break;
          case "bootloader":
            resolve([{ actions: [{ "fastboot:wait": null }] }]);
            break;
          case "download":
            resolve([{ actions: [{ "heimdall:wait": null }] }]);
            break;
          default:
            resolve();
            break;
        }
      });
    });
  }

  /**
   * core:download action
   * @param {Object} param0 {group, files}
   * @returns {Promise}
   */
  download({ group, files }) {
    return download(
      files.map(file => ({
        ...file,
        path: path.join(
          cachePath,
          global.installProperties.device, // FIXME globals are ^-_~*evil*~_-^
          group,
          path.basename(file.url)
        )
      })),
      (progress, speed) => {
        mainEvent.emit("user:write:progress", progress * 100);
        mainEvent.emit("user:write:speed", Math.round(speed * 100) / 100);
        mainEvent.emit("user:write:under", "Downloading");
      },
      (current, total) => {
        if (current > 1) log.info(`Downloaded file ${current} of ${total}`);
        mainEvent.emit(
          "user:write:status",
          `${current} of ${total} files downloaded and verified`,
          true
        );
      },
      activity => {
        switch (activity) {
          case "downloading":
            log.debug(`downloading ${group} files`);
            mainEvent.emit("user:write:working", "download");
            break;
          case "preparing":
            log.debug(`checking previously downloaded ${group} files`);
            mainEvent.emit("user:write:working", "particles");
            mainEvent.emit("user:write:status", "Preparing download", true);
            mainEvent.emit("user:write:under", `Checking ${group} files...`);
          default:
            break;
        }
      }
    )
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:progress", 0);
        mainEvent.emit("user:write:speed", 0);
      })
      .catch(error => {
        log.error("download error: " + error);
        // TODO should this be handled here or outside?
        mainEvent.emit("user:no-network");
        throw new Error(`core:download ${error}`);
      });
  }

  /**
   * core:unpack action
   * @param {Object} param0 {group, files}
   * @returns {Promise}
   */
  unpack({ group, files }) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", `Unpacking ${group}`, true);
        mainEvent.emit("user:write:under", `Unpacking...`);
        return path.join(
          cachePath,
          global.installProperties.device, // FIXME remove global
          group
        );
      })
      .then(basepath =>
        Promise.all(
          files.map(file =>
            unpack(
              path.join(basepath, file.archive),
              path.join(basepath, file.dir)
            )
          )
        )
      );
  }
}

module.exports = new CorePlugin();
