/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const version_info = require('../package.json').version;
const http = require("request");
const progress = require("request-progress");
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
global.installProperties = remote.getGlobal('installProperties');
global.packageInfo =  remote.getGlobal('packageInfo');

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
  return version_info;
}

winston.level = global.installProperties.verbose ? 'debug' : 'info';

var log = {
  error: (l) => {winston.log("error", l)},
  warn:  (l) => {winston.log("warn", l)},
  info:  (l) => {winston.log("info", l)},
  debug: (l) => {winston.log("debug", l)}
}

var createBugReport = (title, callback) => {
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
      log.warn(getPackage())
      if (!err && res.statusCode === 302)
      getos((e,gOs) => {
        callback("*Automatically generated error report* %0D%0A" +
        "UBports Installer Version: " + version_info + " %0D%0A" +
        "Device: " + (installDevice ? installDevice : "Not detected") + "%0D%0A" +
        "Package: " + getPackage() + "%0D%0A" +
        "Operating System: " + getCleanOs() + " " + os.arch() + " %0D%0A" +
        "NodeJS version: " + process.version + " %0D%0A%0D%0A" +
        "Error log: " + res.headers.location + " %0D%0A");
      });
      else callback(false);
    })
  });
}

var getPackage = () => {
  try {
    if (isSnap())
      return "snap";
    else if (fs.existsSync(".git"))
      return "source";
    else if (process.platform == "win32")
      return "exe";
    else if (process.platform == "darwin")
      return "dmg";
    else
      return "unknown"
  } catch (e) {
    return "unknown";
  }
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
  return getLatestInstallerVersion().then((latestVersion) => {
    return latestVersion != version_info;
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
winston.add(winston.transports.File, { filename: path.join(getUbuntuTouchDir(), 'ubports-installer.log') });

var die = (e) => {
    log.error(e);
    process.exit(1);
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
        if(err){
            if (err.message.includes("incorrect password")) {
                log.debug("incorrect password")
                callback(false, {
                  password: true
                });
            } else{
              // Replace password with "" to make sure it wont get logged
              // with password
              log.debug("unknown sudo error")
              callback(false, {
                message: err.message.replace(password, "***")
              });
            }
        }else {
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
  if (tools[tool]) {
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
  if (tools[tool]) {
    logPlatformNativeToolsOnce();
    callback({
        exec: (cmd, cb) => {
            var _cmd = cmd.replace(tool, tools[tool]);
            exec(_cmd, (err, e,r) => {
                // log.debug(_cmd) // CAREFUL! THIS MIGHT LOG PASSWORDS!
                cb(err,e,r);
            })
        },
        done: () => { console.log("done platform tools") }
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
      !commandExistsSync("sudo")
    ) return false;
    else return !process.env.SUDO_UID
}

var ensureRoot = (m) => {
  if(process.env.SUDO_UID)
    return;
  log.error(m)
  process.exit(1);
}

var checkFiles = (urls, callback) => {
    var urls_ = [];
    var next = () => {
        if (urls.length <= 1) {
            callback(urls_)
        } else {
            urls.shift();
            check()
        }
    }
    var check = () => {
        fs.access(path.join(urls[0].path, path.basename(urls[0].url)), (err) => {
            if (err) {
                log.debug("Not existing " + path.join(urls[0].path, path.basename(urls[0].url)));
                urls_.push(urls[0]);
                next();
            } else {
                checksumFile(urls[0], (check) => {
                    if (check) {
                        log.info(path.join(urls[0].path, path.basename(urls[0].url)) + " exists with the expected checksum, so the download will be skipped.")
                        next()
                    } else {
                        log.info("Checksum mismatch on " + path.join(urls[0].path, path.basename(urls[0].url)) + ". This file will be downloaded again.")
                        urls_.push(urls[0]);
                        next()
                    }
                })
            }
        })
    }
    check();
}

var checksumFile = (file, callback) => {
    if (!file.checksum) {
        // No checksum so return true;
        callback(true);
        return;
    }
    checksum.file(path.join(file.path, path.basename(file.url)), {
        algorithm: "sha256"
    }, function(err, sum) {
        log.debug("checked: " +path.basename(file.url), sum === file.checksum);
        callback(sum === file.checksum, sum);
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
var downloadFiles = (urls_, downloadEvent) => {
  var urls;
  var totalFiles;
  downloadEvent.emit("download:startCheck");
  var dl = () => {
    if (!fs.existsSync(urls[0].path)) {
      mkdirp.sync(urls[0].path);
    }
    progress(http(urls[0].url))
    .on('progress', (state) => {
      downloadEvent.emit("download:progress", state.percent*100);
    })
    .on('error', (err) => {
      if (err) downloadEvent.emit("download:error", err);
    })
    .on('end', () => {
      fs.rename(path.join(urls[0].path, path.basename(urls[0].url + ".tmp")),
      path.join(urls[0].path, path.basename(urls[0].url)), () => {
        downloadEvent.emit("download:checking");
        checksumFile(urls[0], (check) => {
          if (check) {
            if (urls.length <= 1) {
              downloadEvent.emit("download:done");
            } else {
              urls.shift();
              downloadEvent.emit("download:next", totalFiles-urls.length+1, totalFiles);
              dl()
            }
          } else {
            downloadEvent.emit("download:error", "Checksum mismatch on file " + path.basename(urls[0].url));
          }
        });
      });
    })
    .pipe(fs.createWriteStream(path.join(urls[0].path, path.basename(urls[0].url + ".tmp"))));
  }
  checkFiles(urls_, (ret) => {
    if (ret.length <= 0) {
      downloadEvent.emit("download:done");
    } else {
      urls = ret;
      totalFiles = urls.length;
      downloadEvent.emit("download:start", totalFiles);
      dl();
    }
  })
  return downloadEvent;
}

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
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
    checksumFile: checksumFile,
    checkFiles: checkFiles,
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
    getRandomInt: getRandomInt,
    getVersion: getVersion,
    hidePassword: hidePassword
}
