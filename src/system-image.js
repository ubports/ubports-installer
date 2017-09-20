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

class event extends events {}

const startCommands = "format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system"
const endCommands = "\nunmount system\n"
const baseUrl = "https://system-image.ubports.com/";
const downloadPath = utils.getUbportDir();
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

var getChannes = (callback) => {
    http.get({
        url: baseUrl + "channels.json",
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    });
}

var getDeviceChannes = (device, channels) => {
    var deviceChannels = [];
    for (var channel in channels) {
        if (channels[channel].hidden || channels[channel].redirect)
          continue;
        if (device in channels[channel]["devices"]) {
            deviceChannels.push(channel);
        }
    }
    return deviceChannels;
}

var getDeviceIndex = (device, channel, callback) => {
    http({
        url: baseUrl + channel + "/" + device + "/index.json",
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    });
}

var getLatestVesion = (index) => {
    //TODO optimize with searching in reverse, but foreach is safer
    // to use now to be sure we get latest version
    var latest = false;
    index.images.forEach((img) => {
        if (img.type === "full" && (!latest || latest.version < img.version)) {
            latest = img;
        }
    })
    return latest;
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
    getDeviceIndex(options.device, options.channel, (index) => {
        if (!index) {
            console.log("error!!")
            thisEvent.emit("error", "could not find device: "+options.device+" on channel: "+options.channel+" index: "+index)
            return;
        }
        var latest = getLatestVesion(index);
        if (!latest) {
            thisEvent.emit("error", "could not find latest version; "+"device: "+options.device+" channel: "+options.channel+" index: "+index)
            return;
        }
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
    })
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
    getChannes: getChannes,
    getDeviceChannes: getDeviceChannes,
    createInstallCommands: createInstallCommands,
    getDeviceIndex: getDeviceIndex,
    getLatestVesion: getLatestVesion,
    downloadLatestVersion: downloadLatestVersion,
    getFilesUrlsArray: getFilesUrlsArray,
    getFileBasenameArray: getFileBasenameArray,
    installLatestVersion: installLatestVersion
}
