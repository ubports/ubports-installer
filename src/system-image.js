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

var downloadLatestVersion = (options) => {
  utils.log.debug("downloadLatestVersion options: ", options);
  systemImage.getLatestVersion(options.device, options.channel).then((latest) => {
    var urls = systemImage.getFilesUrlsArray(latest)
    urls.push.apply(urls, systemImage.getGgpUrlsArray());
    var files = systemImage.getFilePushArray(urls);
    utils.downloadFiles(urls);
    utils.log.debug(urls);
    mainEvent.once("download:done", () => {
      files.push({
        src: systemImage.createInstallCommandsFile(
          systemImage.createInstallCommands(
            latest.files,
            options.installerCheck,
            options.wipe,
            options.enable
          ),
          options.device
        ),
        dest: ubuntuPushDir + ubuntuCommandFile
      });
      mainEvent.emit("download:pushReady", files);
    });
  }).catch(() => {
    mainEvent.emit("error", "could not find latest version; " + "device: " + options.device + " channel: " + options.channel);
  });
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
  downloadLatestVersion(options);
  mainEvent.once("download:pushReady", (files) => {
    pushLatestVersion(files);
  });
}

module.exports = {
  getDeviceChannels: getDeviceChannels,
  installLatestVersion: installLatestVersion
}
