/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const http = require("request");
const download = require("download");
const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const checksum = require('checksum');
const mkdirp = require('mkdirp');
const tmp = require('tmp');
const exec = require('child_process').exec;
const cp = require('child_process');
const sudo = require('electron-sudo');
const winston = require('winston');
const getos = require('getos');
const commandExistsSync = require('command-exists').sync;
const remote = require('electron').remote;
var ipcRenderer = require('electron').ipcRenderer;
global.installProperties = remote ? remote.getGlobal('installProperties') : undefined;
global.packageInfo = remote ? remote.getGlobal('packageInfo') : require('../package.json');

var customTools = {
  adb: undefined,
  fastboot: undefined
}

const platforms = {
  "linux": "linux",
  "darwin": "mac",
  "win32": "win"
}

var platformNativeToolsLogged;
var platformFallbackToolsLogged;

var getVersion = () => {
  return global.packageInfo.version;
}

if (global.installProperties)
  winston.level = global.installProperties.verbose ? 'debug' : 'info';

var log = {
  error: (l) => {winston.log("error", l)},
  warn:  (l) => {winston.log("warn", l)},
  info:  (l) => {winston.log("info", l)},
  debug: (l) => {winston.log("debug", l)}
}

var createBugReport = (title, installProperties, callback) => {
  var options = {
    limit: 400,
    start: 0,
    order: 'desc'
  };

  winston.query(options, function (err, results) {
    if (err) {
      throw err;
    }

    var errorLog = "";
    results.file.forEach((err) => {
      errorLog+=err.level+" "
      errorLog+=err.timestamp+" "
      errorLog+=err.message+"\n"
    })

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
        "Channel: " + (installProperties.channel ? installProperties.channel : "Not yet set") + "%0D%0A" +
        "Package: " + (isSnap() ? "snap" : (packageInfo.package || "source")) + "%0D%0A" +
        "Operating System: " + getCleanOs() + " " + os.arch() + " %0D%0A" +
        "NodeJS version: " + process.version + " %0D%0A%0D%0A" +
        "Error log: https://paste.ubuntu.com/" + res.headers.location + " %0D%0A");
      });
      else callback(false);
    })
  });
}

var getCleanOs = () => {
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
    });
  });
}

var getUbuntuTouchDir = () => {
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
    return path.join(osCacheDir, "ubports")
}

if (!fs.existsSync(getUbuntuTouchDir())) {
    mkdirp.sync(getUbuntuTouchDir());
}
winston.add(winston.transports.File, {
  filename: path.join(getUbuntuTouchDir(), 'ubports-installer.log'),
  level: 'debug', // Print debug logs to the file
  options: { flags: 'w' } // Clear log before writing to it
});

var die = (e) => {
    log.error(e);
    ipcRenderer.send("die", 1);
}

var sudoCommand = (password) => {
    return isSnap() ? "" : "echo '" + password.replace(/\'/g, "'\\''") + "' | sudo -S ";
}

var checkPassword = (password, callback) => {
    if (!needRoot()) {
        log.debug("no root needed")
        callback(true);
        return;
    }
    log.debug("checking password")
    exec(sudoCommand(password) + "echo correct", (err, output) => {
        if (err) {
            if (err.message.includes("incorrect password")) {
                log.debug("incorrect password")
                callback(false, {
                  password: true
                });
            } else {
              // Replace password with "***" to make sure it wont get logged
              log.debug("unknown sudo error")
              callback(false, {
                message: err.message.replace(password, "***")
              });
            }
        } else {
            log.debug("correct password")
            if (output.includes("correct"))
                callback(true);
            else
                callback(false);
        }
    });
}

// WORKAROUND: since we are using asar packages to compress into one package we cannot use
// child_process.exec since it spans a shell and shell wont be able to access the files
// inside the asar package.
var asarExec = (file, callback) => {
    tmp.dir((err, tmpDir, cleanup) => {
        if (err) callback(true);
        fs.copy(file, path.join(tmpDir, path.basename(file)), (err) => {
            fs.chmodSync(path.join(tmpDir, path.basename(file)), 0o755);
            if(err) die(err);
            callback({
                exec: (cmd, cb) => {
                    let name = file.split('/').pop();
                    cmd = cmd.replace(new RegExp(name, 'g'), path.join(tmpDir, path.basename(file)));
                    exec(cmd, (err, e,r) => {
                        // log.debug(cmd) // CAREFUL! THIS MIGHT LOG PASSWORDS!
                        cb(err,e,r);
                    })
                },
                done: () => {
                    fs.removeSync(tmpDir);
                }
            });
        });
    });
}

const logPlatformNativeToolsOnce = () => {
  if (!platformNativeToolsLogged) {
    log.debug("Using native platform tools!");
    platformNativeToolsLogged=true;
  }
}

const logPlatformFallbackToolsOnce = () => {
  if (!platformFallbackToolsLogged) {
    log.debug("Using fallback platform tools!");
    platformFallbackToolsLogged=true;
  }
}

const callbackHook = (callback) => {
  return (a,b,c) => {
    // log.debug(a,b,c);
    callback(a,b,c)
  }
}

const platformToolsExec = (tool, arg, callback) => {
  var tools = getPlatformTools();

  // First check for native tools
  if (tools[tool] && !global.installProperties.forceFallback) {
    logPlatformNativeToolsOnce();
    var cmd = tools[tool] + " " + arg.join(" ");
    // log.debug(cmd) // CAREFUL! THIS MIGHT LOG PASSWORDS!
    cp.exec(cmd, {maxBuffer: 2000*1024}, callbackHook(callback));
    return true;
  }

  // Try using fallback tools
  if (tools.fallback[tool]) {
    logPlatformFallbackToolsOnce();
    // log.debug(tools.fallback[tool] + " " + arg.join(" ")) // CAREFUL! THIS MIGHT LOG PASSWORDS!
    cp.execFile(tools.fallback[tool], arg, {maxBuffer: 2000*1024}, callbackHook(callback));
    return true;
  }
  log.error("NO PLATFORM TOOL USED!");
  callback(true, false);
  return false;
}

const platformToolsExecAsar = (tool, callback) => {
  var tools = getPlatformTools();

  // First check for native
  if (tools[tool] && !global.installProperties.forceFallback) {
    logPlatformNativeToolsOnce();
    callback({
        exec: (cmd, cb) => {
            var _cmd = cmd.replace(tool, tools[tool]);
            exec(_cmd, (err, e,r) => {
                // log.debug(_cmd) // CAREFUL! THIS MIGHT LOG PASSWORDS!
                cb(err,e,r);
            })
        },
        done: () => {}
    });
    return true;
  }

  // Use fallback tools if there are no native tools installed
  if (tools.fallback[tool]) {
    logPlatformFallbackToolsOnce();
    asarExec(tools.fallback[tool], callback);
    return true;
  }
  log.error("NO PLATFORM TOOL USED!");
  callback(true, false);
  return false;
}

var maybeEXE = (platform, tool) => {
    if(platform === "win32") tool+=".exe";
    return tool;
}

var getPlatform = () => {
  var thisPlatform = os.platform();
  if(!platforms[thisPlatform]) die("Unsuported platform");
  return platforms[thisPlatform];
}

// Check if we have native platform tools
const setCustomPlatformTool = (tool, executable) => {
  log.info(tool + " has been set to " + executable)
  customTools[tool] = executable;
}

// Check if we have native platform tools
const getPlatformTools = () => {
  var p = getNativePlatformTools();
  p["fallback"] = getFallbackPlatformTools();
  return p;
}

const getNativePlatformTools = () => {
  var ret = {};
  if (customTools["adb"])
    ret["adb"] = customTools["adb"];
  else if (commandExistsSync("adb"))
    ret["adb"] = "adb";
  if (customTools["fastboot"])
    ret["fastboot"] = customTools["fastboot"];
  else if (commandExistsSync("fastboot"))
    ret["fastboot"] = "fastboot";
  return ret;
}

const getFallbackPlatformTools = () => {
    var thisPlatform = os.platform();
    if(!platforms[thisPlatform]) die("Unsupported platform");
    var platformToolsPath = path.join(__dirname, "/../platform-tools/", platforms[thisPlatform]);
    return {
        fastboot: path.join(platformToolsPath, maybeEXE(thisPlatform, "fastboot")),
        adb: path.join(platformToolsPath, maybeEXE(thisPlatform, "adb"))
    }
}

var isSnap = () => {
  return process.env.SNAP_NAME
}

var needRoot = () => {
    if (
      (os.platform() === "win32") ||
      isSnap() ||
      !commandExistsSync("sudo") ||
      global.installProperties.noRoot ||
      global.installProperties.simulate
    ) return false;
    else return !process.env.SUDO_UID
}

var ensureRoot = (m) => {
  if(process.env.SUDO_UID)
    return;
  log.error(m)
  process.exit(1);
}

function checksumFile(file) {
  return new Promise(function(resolve, reject) {
    fs.access(path.join(file.path, path.basename(file.url)), (err) => {
      if (err) {
        reject();
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
            else reject();
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
          });
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

const hidePassword = (output, pw) => {
  if (needRoot()) {
    return output.replace(pw.replace(/\'/g, "'\\''"), "***");
  } else {
    return output;
  }
}

module.exports = {
    setCustomPlatformTool: setCustomPlatformTool,
    downloadFiles: downloadFiles,
    log: log,
    platformToolsExec: platformToolsExec,
    platformToolsExecAsar: platformToolsExecAsar,
    ensureRoot: ensureRoot,
    isSnap: isSnap,
    getPlatformTools: getPlatformTools,
    getUbuntuTouchDir: getUbuntuTouchDir,
    needRoot: needRoot,
    sudoCommand: sudoCommand,
    checkPassword: checkPassword,
    createBugReport: createBugReport,
    getUpdateAvailable: getUpdateAvailable,
    getPlatform: getPlatform,
    asarExec: asarExec,
    getVersion: getVersion,
    hidePassword: hidePassword,
    die: die,
    ipcRenderer: ipcRenderer,
    setLogLevel: (level) => { winston.level = level; }
}
