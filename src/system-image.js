"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const fs = require("fs");
const utils = require("./utils");
const adb = require("./adb");
const path = require("path");
const mkdirp = require('mkdirp');
const systemImageClient = require("system-image-node-module").Client;

const systemImage = new systemImageClient({path: utils.getUbuntuTouchDir()});

const ubuntuCommandFile = "ubuntu_command";
const ubuntuPushDir = "/cache/recovery/"

const getDeviceChannels = (device) => {
  return systemImage.getDeviceChannels(device);
}

var pushLatestVersion = (files, dontWipeCache) => {
  var doPush = () => {
    adb.shell("mount -a", () => {
      adb.shell("mkdir -p /cache/recovery", () => {
        adb.pushMany(files);
      });
    });
  }
  if (dontWipeCache)
    doPush();
  else
    adb.wipeCache(doPush);
}

var installLatestVersion = (options) => {
  mainEvent.once("download:progress", () => {
    mainEvent.emit("download:start");
  })
  systemImage.downloadLatestVersion(options, (progress, speed) => {
    mainEvent.emit("download:progress", progress);
    mainEvent.emit("download:speed", speed);
  }, (current, total) => {
    if (current != total) mainEvent.emit("download:next", current+1, total);
  }).then((files) => {
    utils.log.debug(files)
    mainEvent.emit("download:done");
    pushLatestVersion(files);
  });
}

module.exports = {
  getDeviceChannels: getDeviceChannels,
  installLatestVersion: installLatestVersion
}
