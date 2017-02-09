const http = require("request");
const progress = require("request-progress");
const os = require("os");
const fs = require("fs");
const path = require("path");
const events = require("events")
const fEvent = require('forward-emitter');

class event extends events {}

const startCommands = "format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system"
const endCommands = "\numount system\n\
                    installer_check"
const baseUrl = "https://system-image.ubports.com/";
const downloadPath = os.homedir() + "/.config/ubports/";
const gpg = ["image-signing.tar.xz", "image-signing.tar.xz.asc", "image-master.tar.xz", "image-master.tar.xz.asc"]

var getInstallCommands = (files, wipe, enable) => {
    var cmd = startCommands;
    if (wipe) cmd += "\nformat data"
    if (files.constructor !== Array)
        return false;
    files.forEach((file) => {
        cmd += "\nupdate " + file.path + " " + file.signature;
    })
    if (enable) {
        if (enable.constructor === Array) {
            enable.forEach((en) => {
                cmd += "\nenable " + en;
            })
        }
    }
    cmd += endCommands;
    return cmd;
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

// TODO use checksums
// TODO download to temp then move to complete folder
// TODO if exist dont download
var downloadFiles = (urls, downloadEvent) => {
    if (!fs.existsSync(downloadPath)) {
        fs.mkdirSync(downloadPath);
    }
    downloadEvent.emit("download:start", urls.length);
    var dl = () => {
        progress(http(urls[0]))
            .on('progress', (state) => {
                console.log(state);
                downloadEvent.emit("download:progress", state);
            })
            .on('error', (err) => {
                downloadEvent.emit("download:error", err)
            })
            .on('end', () => {
                if (urls.length <= 1) {
                    downloadEvent.emit("download:done");
                } else {
                    urls.shift();
                    downloadEvent.emit("download:next", urls.length);
                    dl()
                }
            })
            .pipe(fs.createWriteStream(downloadPath + path.basename(urls[0])));
    }
    dl();
    return downloadEvent;
}

var getGgpUrlsArray = () => {
    gpgUrls = [];
    gpg.forEach((g) => {
        gpgUrls.push(baseUrl + "/gpg/" + g);
    })
    return gpgUrls;
}

var getFilesUrlsArray = (index) => {
    var ret = [];
    index.files.forEach((file) => {
        ret.push(baseUrl + file.path);
        ret.push(baseUrl + file.signature);
    })
    return ret;
}

var getFileBasenameArray = (urls) => {
    var files = [];
    urls.forEach((url) => {
        files.push(downloadPath + path.basename(url));
    });
    return files;
}

var downloadLatestVersion = (device, channel) => {
    const thisEvent = new event();
    getDeviceIndex(device, channel, (index) => {
        var latest = getLatestVesion(index);
        if (!latest) {
            thisEvent.emit("error", "Error finding latest version")
            return;
        }
        var urls = getFilesUrlsArray(latest)
        urls.push.apply(urls, getGgpUrlsArray());
        thisEvent.emit("download:next", urls)
        const downloadEvent = downloadFiles(urls);
        fEvent(thisEvent, downloadEvent);
    })
    return thisEvent;
}

var installLatestVersion = (device, channels, callback) => {

}

module.exports = {
    getChannes: getChannes,
    getDeviceChannes: getDeviceChannes,
    getInstallCommands: getInstallCommands,
    getDeviceIndex: getDeviceIndex,
    getLatestVesion: getLatestVesion,
    downloadFiles: downloadFiles,
    downloadLatestVersion: downloadLatestVersion,
    getFilesUrlsArray: getFilesUrlsArray,
    getFileBasenameArray: getFileBasenameArray
}
