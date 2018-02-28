"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const http = require("request");
const progress = require("request-progress");
const os = require("os");
const fs = require("fs");
const utils = require("./utils");
const adb = require("./adb");
const path = require("path");
const events = require("events")
const fEvent = require('forward-emitter');
const mkdirp = require('mkdirp');
const systemImageClient = require("system-image-node-module").Client;
const systemImage = new systemImageClient();

class event extends events {}

const startCommands = "format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system"
const endCommands = "\nunmount system\n"
const baseUrl = "https://system-image.ubports.com/";
const downloadPath = utils.getUbuntuTouchDir();
const ubuntuCommandFile = "ubuntu_command";
const ubuntuPushDir = "/cache/recovery/"
const gpg = ["image-signing.tar.xz", "image-signing.tar.xz.asc", "image-master.tar.xz", "image-master.tar.xz.asc"]

var createInstallCommands = (files, installerCheck, wipe, enable) => {
    var cmd = startCommands;
    if (wipe === true) cmd += "\nformat data"
    if (files.constructor !== Array)
        return false;
    files.forEach((file) => {
        cmd += "\nupdate " + path.basename(file.path) + " " + path.basename(file.signature);
    })
    if (enable) {
        if (enable.constructor === Array) {
            enable.forEach((en) => {
                cmd += "\nenable " + en;
            })
        }
    }
    cmd += endCommands;
    if (installerCheck) cmd += "\ninstaller_check";
    return cmd;
}

var createInstallCommandsFile = (cmds, device) => {
    if (!fs.existsSync(downloadPath + "/commandfile/")) {
        mkdirp.sync(downloadPath + "/commandfile/");
    }
    var file = downloadPath + "/commandfile/" + ubuntuCommandFile + device + getRandomInt(1000, 9999);
    fs.writeFileSync(file, cmds);
    return file;
}

var getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

const getDeviceChannels = (device) => {
    return systemImage.getDeviceChannels(device);
}

var getGgpUrlsArray = () => {
    var gpgUrls = [];
    gpg.forEach((g) => {
        gpgUrls.push({
            url: baseUrl + "/gpg/" + g,
            path: downloadPath + "gpg"
        })
    })
    return gpgUrls;
}

var getFilesUrlsArray = (index) => {
    var ret = [];
    index.files.forEach((file) => {
        ret.push({
            url: baseUrl + file.path,
            path: downloadPath + "pool",
            checksum: file.checksum
        })
        ret.push({
            url: baseUrl + file.signature,
            path: downloadPath + "pool"
        })
    })
    return ret;
}

var getFileBasenameArray = (urls) => {
    var files = [];
    urls.forEach((url) => {
        files.push(path.basename(url.url));
    });
    return files;
}

var getFilePathArray = (urls) => {
    var files = [];
    urls.forEach((url) => {
        files.push(url.path + "/" + path.basename(url.url));
    });
    return files;
}

var getFilePushArray = (urls) => {
    var files = [];
    urls.forEach((url) => {
        files.push({
            src: url.path + "/" + path.basename(url.url),
            dest: ubuntuPushDir
        });
    });
    return files;
}

var downloadLatestVersion = (options) => {
    console.log("downloadLatestVersion options: ", options);
    var thisEvent;
    if (!options.event)
        thisEvent = new event();
    else
        thisEvent = options.event;
    systemImage.getLatestVesion(options.device, options.channel).then((latest) => {
        var urls = getFilesUrlsArray(latest)
        urls.push.apply(urls, getGgpUrlsArray());
        var files = getFilePushArray(urls);
        utils.downloadFiles(urls, thisEvent);
        utils.log.debug(urls);
        thisEvent.once("download:done", () => {
            files.push({
                src: createInstallCommandsFile(createInstallCommands(latest.files, options.installerCheck, options.wipe, options.enable), options.device),
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
    createInstallCommands: createInstallCommands,
    downloadLatestVersion: downloadLatestVersion,
    getFilesUrlsArray: getFilesUrlsArray,
    getFileBasenameArray: getFileBasenameArray,
    installLatestVersion: installLatestVersion
}
