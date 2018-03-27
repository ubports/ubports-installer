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
const systemImage = new systemImageClient();

class event extends events {}

const baseUrl = "https://system-image.ubports.com/";
const downloadPath = utils.getUbuntuTouchDir();
const ubuntuCommandFile = "ubuntu_command";
const ubuntuPushDir = "/cache/recovery/"
const gpg = ["image-signing.tar.xz", "image-signing.tar.xz.asc", "image-master.tar.xz", "image-master.tar.xz.asc"]

const createInstallCommandsFile = (cmds, device) => {
    if (!fs.existsSync(downloadPath + "/commandfile/")) {
        mkdirp.sync(downloadPath + "/commandfile/");
    }
    var file = downloadPath + "/commandfile/" + ubuntuCommandFile + device + utils.getRandomInt(1000, 9999);
    fs.writeFileSync(file, cmds);
    return file;
}

const getDeviceChannels = (device) => {
    return systemImage.getDeviceChannels(device);
}

const getGgpUrlsArray = () => {
    var gpgUrls = [];
    gpg.forEach((g) => {
        gpgUrls.push({
            url: baseUrl + "/gpg/" + g,
            path: path.join(downloadPath, "gpg")
        })
    })
    return gpgUrls;
}

const getFilesUrlsArray = (index) => {
    var ret = [];
    index.files.forEach((file) => {
        ret.push({
            url: baseUrl + file.path,
            path: path.join(downloadPath, "pool"),
            checksum: file.checksum
        })
        ret.push({
            url: baseUrl + file.signature,
            path: path.join(downloadPath, "pool")
        })
    })
    return ret;
}

var downloadLatestVersion = (options) => {
    console.log("downloadLatestVersion options: ", options);
    var thisEvent;
    if (!options.event)
        thisEvent = new event();
    else
        thisEvent = options.event;
    systemImage.getLatestVersion(options.device, options.channel).then((latest) => {
        var urls = getFilesUrlsArray(latest)
        urls.push.apply(urls, getGgpUrlsArray());
        var files = systemImage.getFilePushArray(urls);
        utils.downloadFiles(urls, thisEvent);
        utils.log.debug(urls);
        thisEvent.once("download:done", () => {
            files.push({
                src: createInstallCommandsFile(systemImage.createInstallCommands(latest.files, options.installerCheck, options.wipe, options.enable), options.device),
                dest: ubuntuPushDir + ubuntuCommandFile
            });
            thisEvent.emit("download:pushReady", files);
        })
    }).catch(() => {
      thisEvent.emit("error", "could not find latest version; "+"device: "+options.device+" channel: "+options.channel)
    });
    return thisEvent;
}

var pushLatestVersion = (files, thisEvent, dontWipeCache) => {
    var doPush = () => {
      adb.shell("mount -a", () => {
        adb.shell("mkdir -p /cache/recovery", () => {
          adb.pushMany(files, thisEvent);
        })
      })
    }
    if (dontWipeCache)
      doPush()
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
    getFilesUrlsArray: getFilesUrlsArray,
    installLatestVersion: installLatestVersion
}
