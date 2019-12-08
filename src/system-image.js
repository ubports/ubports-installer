"use strict";

/*
 * Copyright (C) 2017-2019 UBports Foundation <info@ubports.com>
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

const utils = require("./utils");
const systemImageClient = require("system-image-node-module").Client;

const systemImage = new systemImageClient({ path: utils.getUbuntuTouchDir() });

const getDeviceChannels = device => {
  return systemImage.getDeviceChannels(device);
};

var installLatestVersion = options => {
  return new Promise(function(resolve, reject) {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit("user:write:status", "Downloading Ubuntu Touch", true);
    mainEvent.emit("user:write:under", "Checking local files");
    systemImage
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
            utils.log.debug(
              "Downloading system-image file " + (current + 1) + " of " + total
            );
        }
      )
      .then(files => {
        mainEvent.emit("download:done");
        mainEvent.emit("user:write:progress", 0);
        mainEvent.emit("user:write:working", "push");
        mainEvent.emit("user:write:status", "Sending", true);
        mainEvent.emit("user:write:under", "Sending files to the device");
        adb
          .waitForDevice()
          .then(() => {
            adb
              .wipeCache()
              .then(() => {
                utils.log.debug("adb wiped cache");
                adb
                  .shell("mount -a")
                  .then(() => {
                    utils.log.debug("adb mounted recovery");
                    adb
                      .shell("mkdir -p /cache/recovery")
                      .then(() => {
                        adb
                          .verifyPartitionType("data", "ext4")
                          .then(isExt4 => {
                            if (isExt4) {
                              utils.log.debug(
                                "data partition seems to exist as ext4"
                              );
                            } else {
                              utils.log.warning(
                                "data partition does not seem to exist as ext4"
                              );
                            }
                          })
                          .catch(utils.log.warn);
                        utils.log.debug(
                          "adb created /cache/recovery directory"
                        );
                        adb
                          .pushArray(files, progress => {
                            global.mainEvent.emit(
                              "user:write:progress",
                              progress * 100
                            );
                          })
                          .then(() => {
                            resolve();
                          })
                          .catch(e => reject("Push failed: Failed push: " + e));
                      })
                      .catch(e =>
                        reject("Push failed: Failed to create target dir: " + e)
                      );
                  })
                  .catch(e => reject("Push failed: Failed to mount: " + e));
              })
              .catch(e => reject("Push failed: Failed wipe cache: " + e));
          })
          .catch(e => reject("no device"));
      })
      .catch(e => reject("Download failed: " + e));
  });
};

module.exports = {
  getDeviceChannels: getDeviceChannels,
  installLatestVersion: installLatestVersion
};
