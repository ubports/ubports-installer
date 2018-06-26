"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const fs = require("fs");
const utils = require("./utils");
const adb = require("./adb");
const path = require("path");
const events = require("events")
const mkdirp = require('mkdirp');
const systemImageClient = require("system-image-node-module").Client;

const systemImage = new systemImageClient({path: utils.getUbuntuTouchDir()});
class event extends events {}

const ubuntuCommandFile = "ubuntu_command";
const ubuntuPushDir = "/cache/recovery/"

const getDeviceChannels = (device) => {
  return systemImage.getDeviceChannels(device);
}

var downloadLatestVersion = (options) => {
  console.log("downloadLatestVersion options: ", options);
  var thisEvent;
  if (!options.event)
    thisEvent = new event();
  else
    thisEvent = options.event;
  systemImage.getLatestVersion(options.device, options.channel).then((latest) => {
    var urls = systemImage.getFilesUrlsArray(latest)
    urls.push.apply(urls, systemImage.getGgpUrlsArray());
    var files = systemImage.getFilePushArray(urls);
    utils.downloadFiles(urls, thisEvent);
    utils.log.debug(urls);
    thisEvent.once("download:done", () => {
      files.push({
        src: systemImage.createInstallCommandsFile(systemImage.createInstallCommands(latest.files, options.installerCheck, options.wipe, options.enable), options.device),
        dest: ubuntuPushDir + ubuntuCommandFile
      });
      thisEvent.emit("download:pushReady", files);
    });
  }).catch(() => {
    thisEvent.emit("error", "could not find latest version; " + "device: " + options.device + " channel: " + options.channel);
  });
  return thisEvent;
}

var pushMany = (files, pushManyEvent) => {
  var totalLength = files.length;
  if (files.length <= 0){
    pushManyEvent.emit("adbpush:error", "No files provided");
    return false;
  }
  
  pushManyEvent.emit("adbpush:start", files.length);
  
  adb.push(files[0].src, files[0].dest, pushManyEvent);
  pushManyEvent.on("adbpush:end", () => {
        files.shift();
        if (files.length <= 0){
          pushManyEvent.emit("adbpush:done");
          return;
        }
        pushManyEvent.emit("adbpush:next", files.length, totalLength)
        adb.push(files[0].src, files[0].dest, pushManyEvent);
  })
  return pushManyEvent
}

var pushLatestVersion = (files, thisEvent, dontWipeCache) => {
  var doPush = () => {
    adb.shell("mount -a", () => {
      adb.shell("mkdir -p /cache/recovery", () => {
        pushMany(files, thisEvent);
      });
    });
  }
  if (dontWipeCache)
    doPush();
  else
    adb.wipeCache(doPush);
  return thisEvent;
}

var installLatestVersion = (options) => {
  var downloadEvent = downloadLatestVersion(options);
  downloadEvent.once("download:pushReady", (files) => {
    pushLatestVersion(files, downloadEvent)
  });
  return downloadEvent;
}

module.exports = {
  getDeviceChannels: getDeviceChannels,
  downloadLatestVersion: downloadLatestVersion,
  installLatestVersion: installLatestVersion
}
