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

const Plugin = require("../plugin.js");
const fs = require("fs-extra");
const path = require("path");
const { download, checkFile } = require("progressive-downloader");
const mainEvent = require("../../../lib/mainEvent.js");
const { unpack } = require("../../../lib/asarLibs.js");
const log = require("../../../lib/log.js");

/**
 * core plugin
 * @extends Plugin
 */
class CorePlugin extends Plugin {
  /**
   * core:end end action
   * @returns {Promise}
   */
  action__end() {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:done");
      mainEvent.emit(
        "user:write:status",
        this.props.os.name + " successfully installed!",
        false
      );
      mainEvent.emit(
        "user:write:under",
        this.props.os.success_message ||
          "All done! Enjoy exploring your new OS!"
      );
    });
  }

  /**
   * core:group action
   * @param {Array} group array of steps
   * @returns {Promise}
   */
  action__group(group) {
    return Promise.resolve(group.length ? group : null);
  }

  /**
   * core:user_action action
   * @param {Object} action action
   * @returns {Promise}
   */
  action__user_action({ action }) {
    const user_action = this.props.config.user_actions[action];
    return user_action
      ? new Promise(function(resolve, reject) {
          mainEvent.emit("user:action", user_action, () => {
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
        })
      : Promise.reject(new Error(`Unknown user_action: ${action}`));
  }

  /**
   * core:download action
   * @param {Object} param0 {group, files}
   * @returns {Promise}
   */
  action__download({ group, files }) {
    return download(
      files.map(file => ({
        ...file,
        path: path.join(
          this.cachePath,
          this.props.config.codename,
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
  action__unpack({ group, files }) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", `Unpacking ${group}`, true);
        mainEvent.emit("user:write:under", `Unpacking...`);
        return path.join(this.cachePath, this.props.config.codename, group);
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

  action__manual_download({ group, file }) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Manual download");
        mainEvent.emit("user:write:under", `Checking ${group} files...`);
        return checkFile(
          {
            checksum: file.checksum,
            path: path.join(
              this.cachePath,
              this.props.config.codename,
              group,
              file.name
            )
          },
          false
        );
      })
      .then(ok => {
        if (!ok) {
          return new Promise(resolve => {
            setTimeout(() => {
              mainEvent.emit("user:manual_download", file, group, path =>
                resolve(path)
              );
              mainEvent.emit("user:write:under", "Manual download required!");
            }, 10);
          })
            .then(downloadedFilePath => {
              fs.ensureDir(
                path.join(this.cachePath, this.props.config.codename, group)
              ).then(() =>
                fs.copyFile(
                  downloadedFilePath,
                  path.join(
                    this.cachePath,
                    this.props.config.codename,
                    group,
                    file.name
                  )
                )
              );
            })
            .then(() =>
              checkFile(
                {
                  checksum: file.checksum,
                  path: path.join(
                    this.cachePath,
                    this.props.config.codename,
                    group,
                    file.name
                  )
                },
                true
              )
            )
            .then(ok => {
              if (ok) {
                return ok;
              } else {
                throw new Error("checksum mismatch");
              }
            });
        }
      });
  }
}

module.exports = CorePlugin;
