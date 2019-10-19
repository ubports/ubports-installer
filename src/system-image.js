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

const systemImage = new systemImageClient({path: utils.getUbuntuTouchDir()});

const getDeviceChannels = (device) => {
  return systemImage.getDeviceChannels(device);
}

var installLatestVersion = (options) => {
  return new Promise(function(resolve, reject) {
    mainEvent.emit("user:write:working", "download");
    mainEvent.emit("user:write:status", "Downloading Ubuntu Touch");
    mainEvent.emit("user:write:under", "Downloading");
    systemImage.downloadLatestVersion(options, (progress, speed) => {
      mainEvent.emit("user:write:progress", progress*100);
      mainEvent.emit("user:write:speed", Math.round(speed*100)/100);
    }, (current, total) => {
      if (current != total) utils.log.debug("Downloading system-image file " + (current+1) + " of " + total);
    }).then((files) => {
      mainEvent.emit("download:done");
      mainEvent.emit("user:write:progress", 0);
      mainEvent.emit("user:write:working", "push");
      mainEvent.emit("user:write:status", "Sending");
      mainEvent.emit("user:write:under", "Sending files to the device");
      adb.wipeCache().then(() => {
        adb.shell("mount -a").then(() => {
          adb.shell("mkdir -p /cache/recovery").then(() => {
            adb.pushArray(files, (progress) => {
              global.mainEvent.emit("user:write:progress", progress*100);
            }).then(() => {
              resolve();
            }).catch(e => utils.errorToUser(e, "Push failed: Failed push"));
          }).catch(e => utils.errorToUser(e, "Push failed: Failed to create target dir"));
        }).catch(e => utils.errorToUser(e, "Push failed: Failed to mount"));
      }).catch(e => utils.errorToUser(e, "Push failed: Failed wipe cache"));
    }).catch(e => utils.errorToUser(e, "Download failed"));
  });
}

module.exports = {
  getDeviceChannels: getDeviceChannels,
  installLatestVersion: installLatestVersion
}
