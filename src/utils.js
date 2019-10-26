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

const http = require("request");
const download = require("download");
const shell = require("electron").shell;
const exec = require('child_process').exec;
const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const checksum = require('checksum');
const mkdirp = require('mkdirp');
const cp = require('child_process');
const getos = require('getos');
global.packageInfo = require('../package.json');

if (!fs.existsSync(getUbuntuTouchDir())) {
  mkdirp.sync(getUbuntuTouchDir());
}

const platforms = {
  "linux": "linux",
  "darwin": "mac",
  "win32": "win"
}

var log = {
  error: (l) => { global.logger.log("error", l); },
  warn:  (l) => { global.logger.log("warn", l); },
  info:  (l) => { global.logger.log("info", l); },
  debug: (l) => { global.logger.log("debug", l); }
}

function createBugReport(title, installProperties, callback) {
  var options = {
    limit: 400,
    start: 0,
    order: 'desc'
  };

  global.logger.query(options, function (err, results) {
    if (err) {
      throw err;
    }

    var errorLog = "";
    results.file.forEach((err) => {
      errorLog+=err.level+": "
      errorLog+=err.message+"\n"
    });

    http.post({
      url: "http://paste.ubuntu.com",
      form: {
        poster: "UBports Installer bug",
        syntax: "text",
        content: "Title: " + title + "\n\n" + errorLog
      }
    }, (err, res, bod) => {
      if (!err && res.statusCode === 302)
      getos((e,gOs) => {
        callback("*Automatically generated error report* %0D%0A" +
        "UBports Installer Version: " + global.packageInfo.version + " %0D%0A" +
        "Device: " + (installProperties.device ? installProperties.device : "Not detected") + "%0D%0A" +
        "Channel: " + (installProperties.settings && installProperties.settings.channel ? installProperties.settings.channel  : "Not yet set") + "%0D%0A" +
        "Package: " + (isSnap() ? "snap" : (global.packageInfo.package || "source")) + "%0D%0A" +
        "Operating System: " + getCleanOs() + " " + os.arch() + " %0D%0A" +
        "NodeJS version: " + process.version + " %0D%0A%0D%0A" +
        "Error log: https://paste.ubuntu.com/" + res.headers.location + " %0D%0A");
      });
      else callback(false);
    })
  });
}

function sendBugReport(title) {
  createBugReport(title, global.installProperties, (body) => {
    shell.openExternal("https://github.com/ubports/ubports-installer/issues/new?title="+title+"&body="+body);
  });
}

function getCleanOs() {
  try {
    return getos((e,gOs) => {
      if(gOs.os == "linux")
        return gOs.dist + (gOs.release =! undefined ? " " + gOs.release : "") + (gOs.codename =! undefined ? " " + gOs.codename : "");
      else if(gOs.os == "darwin")
        return "macOS " + cp.execSync('sw_vers -productVersion').toString().trim() + cp.execSync('sw_vers -buildVersion').toString().trim();
      else if(gOs.os == "win32")
        return cp.execSync('ver').toString().trim();
      else {
        return gOs.os;
      }
    });
  } catch (e) {
    log.error(e);
    return process.platform;
  }
}

function getLatestInstallerVersion() {
  return new Promise((resolve, reject) => {
    http.get({
      url: "https://api.github.com/repos/ubports/ubports-installer/releases/latest",
      json: true,
      headers: { 'User-Agent': 'request' }
    },
    (err, res, bod) => {
      if (!err && res.statusCode === 200) {
        resolve(bod.tag_name);
      } else {
        reject();
      }
    });
  });
}

function getUpdateAvailable() {
  return new Promise((resolve, reject) => {
    getLatestInstallerVersion().then((latestVersion) => {
      if(latestVersion != global.packageInfo.version) resolve();
      else reject();
    }).catch(resolve);
  });
}

function getUbuntuTouchDir() {
  var osCacheDir;
  switch (process.platform) {
      case "linux":
      osCacheDir = path.join(process.env.HOME, '.cache');
    break;
      case "darwin":
      osCacheDir = path.join(process.env.HOME, 'Library/Caches');
    break;
      case "win32":
      osCacheDir = process.env.APPDATA;
    break;
      default:
      throw Error("Unknown platform " + process.platform);
  }
  return path.join(osCacheDir, "ubports");
}

function die(e) {
  log.error(e);
  process.exit(-1);
}

let toolpath = global.packageInfo.package ?
  path.join(__dirname, "../../app.asar.unpacked/platform-tools", platforms[os.platform()]) :
  path.join(__dirname, "..", "platform-tools", platforms[os.platform()]);
function execTool(tool, args, callback) {
  exec(
    [path.join(toolpath, tool)].concat(args).join(" "),
    {options: {maxBuffer: 1024*1024*2}},
    callback
  );
}

function isSnap() {
  return process.env.SNAP_NAME
}

function checksumFile(file) {
  return new Promise(function(resolve, reject) {
    fs.access(path.join(file.path, path.basename(file.url)), (err) => {
      if (err) {
        reject(err);
      } else {
        if (!file.checksum) {
          // No checksum so return true;
          resolve();
          return;
        } else {
          checksum.file(path.join(file.path, path.basename(file.url)), {
            algorithm: "sha256"
          }, function(err, sum) {
            utils.log.debug("checked: " +path.basename(file.url), sum === file.checksum);
            if (sum === file.checksum) resolve();
            else reject("checksum mismatch: calculated " + sum  + " but expected " + file.checksum);
          });
        }
      }
    });
  });
}

/*
urls format:
[
  {
    url: "http://test.com", (source url)
    path: ".bla/bal/", (download target)
    checksum: "d342j43lj34hgth324hj32ke4" (sha256sum)
  }
]
*/
function downloadFiles(urls, progress, next) {
  return new Promise(function(resolve, reject) {
    var filesDownloaded = 0;
    var overallSize = 0;
    var overallDownloaded = 0;
    var previousOverallDownloaded = 0;
    var downloadProgress = 0;
    var progressInterval = setInterval(() => {
      downloadProgress = overallDownloaded/overallSize;
      if (overallSize != 0) {
        if (downloadProgress < 0.999) {
          progress(downloadProgress, (overallDownloaded-previousOverallDownloaded)/1000000);
          previousOverallDownloaded = overallDownloaded;
        } else {
          clearInterval(progressInterval);
          progress(1, 0);
        }
      }
    }, 1000);
    Promise.all(urls.map((file) => {
      return new Promise(function(resolve, reject) {
        checksumFile(file).then(() => {
          next(++filesDownloaded, urls.length);
          resolve();
          return;
        }).catch(() => {
          download(file.url, file.path).on("response", (res) => {
            var totalSize = eval(res.headers['content-length']);
            overallSize += totalSize;
            var downloaded = 0;
            res.on('data', data => {
              overallDownloaded += data.length;
            });
          }).then(() => {
            checksumFile(file).then(() => {
              next(++filesDownloaded, urls.length);
              resolve();
              return;
            }).catch((err) => {
              reject(err);
              return;
            });
          }).catch(reject);
        });
      });
    })).then(() => {
      resolve();
      return;
    }).catch((err) => {
      reject(err);
      return;
    });
  });
}

function errorToUser(error, errorLocation) {
  var errorString = "Error: " + (errorLocation ? errorLocation : "Unknown") + ": " + error;
  utils.log.error(errorString);
  global.mainEvent.emit("user:error", errorString);
}

module.exports = {
  errorToUser: errorToUser,
  downloadFiles: downloadFiles,
  log: log,
  isSnap: isSnap,
  execTool: execTool,
  getUbuntuTouchDir: getUbuntuTouchDir,
  sendBugReport: sendBugReport,
  getUpdateAvailable: getUpdateAvailable,
  die: die
}
