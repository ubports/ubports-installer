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
const window = require("../../../lib/window.js");

const _7z = require("7zip-min");
if ("electron" in process.versions) {
  _7z.config({
    binaryPath: _7z
      .getConfig()
      .binaryPath.replace("app.asar", "app.asar.unpacked")
  });
}

/**
 * core plugin
 * @extends Plugin
 */
class CorePlugin extends Plugin {
  /**
   * core:end action
   * @returns {Promise}
   */
  action__end() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:done", this.props.os.name);
      this.event.emit(
        "user:write:status",
        this.props.os.name + " successfully installed!",
        false
      );
      this.event.emit(
        "user:write:under",
        this.props.os.success_message ||
          "All done! Enjoy exploring your new OS!"
      );
    });
  }

  /**
   * core:info action
   * @returns {Promise}
   */
  action__info({ status, dots, info, progress, speed }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:progress", progress ? progress * 100 : 0);
      this.event.emit(
        "user:write:speed",
        speed ? Math.round(speed * 100) / 100 : false
      );
      if (status) {
        this.event.emit("user:write:status", status, dots);
      }
      if (info) {
        this.event.emit("user:write:under", info);
      }
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
    const _event = this.event;
    return user_action
      ? new Promise(function (resolve, reject) {
          _event.emit("user:action", user_action, () => {
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
          file.name || path.basename(file.url)
        )
      })),
      (progress, speed) => {
        this.event.emit("user:write:progress", progress * 100);
        this.event.emit("user:write:speed", Math.round(speed * 100) / 100);
        this.event.emit("user:write:under", "Downloading");
      },
      (current, total) => {
        if (current > 0)
          this.log.info(`Downloaded file ${current} of ${total}`);
        else this.log.info(`Downloading ${total} files`);
        this.event.emit(
          "user:write:status",
          `${current} of ${total} files downloaded and verified`,
          true
        );
      },
      activity => {
        switch (activity) {
          case "downloading":
            this.log.debug(`downloading ${group} files`);
            this.event.emit("user:write:working", "download");
            break;
          case "preparing":
            this.log.debug(`checking previously downloaded ${group} files`);
            this.event.emit("user:write:working", "squares");
            this.event.emit("user:write:status", "Preparing download", true);
            this.event.emit("user:write:under", `Checking ${group} files...`);
          default:
            break;
        }
      }
    )
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:progress", 0);
        this.event.emit("user:write:speed", 0);
      })
      .catch(error => {
        this.log.error("download error: " + error);
        // TODO should this be handled here or outside?
        this.event.emit("user:no-network");
        throw new Error(`core:download ${error}`);
      });
  }

  /**
   * core:write action
   * @param {Object} param0 {group, file, content}
   */
  action__write({ group, file, content }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "squares");
      this.event.emit("user:write:status", `Writing ${group} config file`);
      this.event.emit("user:write:under", `Writing file...`);
      return fs.writeFile(
        path.join(this.cachePath, this.props.config.codename, group, file),
        content
      );
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
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", `Unpacking ${group}`, true);
        this.event.emit("user:write:under", `Unpacking...`);
        return path.join(this.cachePath, this.props.config.codename, group);
      })
      .then(basepath =>
        Promise.all(
          files.map(file => {
            const archive = path.join(basepath, file.archive);
            const directory = path.join(basepath, file.dir || ".");
            this.log.debug("Unpacking " + archive + " to: " + directory);
            return new Promise(function (resolve, reject) {
              _7z.unpack(archive, directory, err => {
                if (err) {
                  reject(Error("Failed to unpack: " + err));
                } else {
                  resolve();
                }
              });
            });
          })
        )
      )
      .then(() => Promise.resolve());
  }

  /**
   * core:unpack_move action
   * @param {Object} param0 {group, files}
   * @returns {Promise}
   */
  action__unpack_move({ group, files }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit(
          "user:write:status",
          `Moving unpacked ${group} files`,
          true
        );
        this.event.emit("user:write:under", `Moving unpacked files...`);
        return path.join(this.cachePath, this.props.config.codename, group);
      })
      .then(basepath =>
        Promise.all(
          files.map(file => {
            const src = path.join(basepath, file.src);
            const dst = path.join(basepath, file.dst);
            return this.moveFiles(src, dst);
          })
        )
      )
      .then(() => Promise.resolve());
  }

  /**
   * core:manual_download action
   * @param {Object} param0 {group, file}
   * @returns {Promise}
   */
  action__manual_download({ group, file }) {
    return Promise.resolve()
      .then(() => {
        this.event.emit("user:write:working", "squares");
        this.event.emit("user:write:status", "Manual download");
        this.event.emit("user:write:under", `Checking ${group} files...`);
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
        const _event = this.event;
        if (!ok) {
          return new Promise(resolve => {
            setTimeout(() => {
              _event.emit("user:manual_download", file, group, path =>
                resolve(path)
              );
              _event.emit("user:write:under", "Manual download required!");
            }, 10);
          })
            .then(downloadedFilePath =>
              fs
                .ensureDir(
                  path.join(this.cachePath, this.props.config.codename, group)
                )
                .then(() =>
                  fs.copyFile(
                    downloadedFilePath,
                    path.join(
                      this.cachePath,
                      this.props.config.codename,
                      group,
                      file.name
                    )
                  )
                )
            )
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
              window.send("user:manual_download:check", ok);
              if (ok) {
                return ok;
              } else {
                throw new Error("checksum mismatch");
              }
            });
        }
      });
  }

  moveFiles(sourceDir, targetDir) {
    return new Promise((resolve, reject) => {
      fs.readdir(sourceDir, (err, files) => {
        if (err) {
          reject(err);
          return;
        }

        files.forEach(file => {
          const oldPath = path.join(sourceDir, file);
          const newPath = path.join(targetDir, file);
          const stat = fs.lstatSync(oldPath);

          if (stat.isDirectory()) {
            moveFiles(oldPath, targetDir)
              .then(() => {
                if (files.indexOf(file) === files.length - 1) {
                  resolve();
                }
              })
              .catch(err => reject(err));
          } else if (stat.isFile()) {
            fs.rename(oldPath, newPath, err => {
              if (err) {
                reject(err);
                return;
              }

              if (files.indexOf(file) === files.length - 1) {
                resolve();
              }
            });
          }
        });
      });
    });
  }
}

module.exports = CorePlugin;
