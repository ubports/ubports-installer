"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const utils = require("./utils");
const systemImageClient = require("system-image-node-module").Client;

const systemImage = new systemImageClient({path: utils.getUbuntuTouchDir()});

const getDeviceChannels = (device) => {
  return systemImage.getDeviceChannels(device);
}

var installLatestVersion = (options) => {
  mainEvent.emit("user:write:working", "download");
  mainEvent.emit("user:write:status", "Downloading Ubuntu Touch");
  mainEvent.emit("user:write:under", "Downloading");
  systemImage.downloadLatestVersion(options, (progress, speed) => {
    mainEvent.emit("download:progress", progress);
    mainEvent.emit("download:speed", speed);
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
            global.mainEvent.emit("adbpush:done");
          }).catch(e => utils.errorToUser("Push failed: Failed push: " + e));
        }).catch(e => utils.errorToUser("Push failed: Failed to create target dir: " + e));
      }).catch(e => utils.errorToUser("Push failed: Failed to mount: " + e));
    }).catch(e => utils.errorToUser("Push failed: Failed wipe cache: " + e));
  });
}

module.exports = {
  getDeviceChannels: getDeviceChannels,
  installLatestVersion: installLatestVersion
}
