/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const version = "0.1.8-beta"

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
//const decompress = require('decompress');
//const decompressTarxz = require('decompress-tarxz');

const platforms = {
    "linux": "linux",
    "darwin": "mac",
    "win32": "win"
}

var platfromToolsLoged;
var platfromToolsLogedF;

var debugScreen = () => {
  return process.env.DEBUG ? process.env.SCREEN : null
}

var debugTrigger = (event, stage) => {
  if (!process.env.DEBUG || !process.env.TRIGGER)
    return
  var args = process.env.TRIGGER.split(",");
  if (stage ==! args[1])
    return
  setTimeout(function () {
    event.emit(args[1], args[2]);
  }, 10);
}

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

  var errorLog = ""
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
      content: "Title: "+title+
      "\n"+errorLog
    }
  }, (err, res, bod) => {
      if (!err && res.statusCode === 302)
        getos((e,gOs) => {
          callback("Automatically generated error report %0A\
Version: "+version+" %0A\
Host OS: "+gOs.os+" %0A\
Host Dist: "+gOs.dist+" "+gOs.release+ "%0A\
Host Arch: "+os.arch()+" %0A\
Node: "+process.version+" %0A%0A\
Error log: "+res.headers.location+" %0A")
        })
      else callback(false);
  })
});

}

const checkForNewUpdate = (callback) => {
  http.get({
              url: "https://api.github.com/repos/ubports/ubports-installer/releases/latest",
              json: true,
              headers: {
                'User-Agent': 'request'
              }
           },
           (err, res, bod) => {
             if (!err && res.statusCode === 200) {
               console.log(bod.tag_name !== version)
             }
           })
}

var getUbportDir = () => {
    return path.join(process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support' : process.env.HOME + '/.cache'), "ubports/")
}

if (!fs.existsSync(getUbportDir())) {
    mkdirp.sync(getUbportDir());
}
winston.add(winston.transports.File, { filename: path.join(getUbportDir(), 'ubports-installer.log') });
winston.level = 'debug';

var die = (e) => {
    log.error(e);
    process.exit(1);
}

var checkPassword = (password, callback) => {
    if (!needRoot()) {
        log.debug("no root needed")
        callback(true);
        return;
    }
    log.debug("checking password")
    exec("echo '" + password.replace("'", "\\'") + "' | sudo -S echo correct", (err, output) => {
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
                message: err.message.replace(password, "")
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
                    cmd=cmd.replace(new RegExp(file, 'g'), path.join(tmpDir, path.basename(file)));
                    log.debug("Running platform tool fallback exec asar cmd "+cmd);
                    exec(cmd, (err, e,r) => {
                        cb(err,e,r);
                    })
                },
                done: () => {
                    fs.removeSync(tmpDir);
                }
            });
        })
    })

}

const logPlatformNativeToolsOnce = () => {
  if (!platfromToolsLoged) {
    log.debug("Using native platform tools!");
    platfromToolsLoged=true;
  }
}

const logPlatformFallbackToolsOnce = () => {
  if (!platfromToolsLogedF) {
    log.debug("Using fallback platform tools!");
    platfromToolsLogedF=true;
  }
}

const callbackHook = (callback) => {
  return (a,b,c) => {
    log.debug(a,b,c);
    callback(a,b,c)
  }
}

const platfromToolsExec = (tool, arg, callback) => {
  console.log("plat")
  var tools = getPlatformTools();
  console.log(tools)
  // Check first for native
  if (tools[tool]) {
    logPlatformNativeToolsOnce();
    var cmd = tools[tool] + " " + arg.join(" ");
    log.debug("Running platform tool exec cmd "+cmd);
    cp.exec(cmd, {maxBuffer: 2000*1024}, callbackHook(callback));
    return true;
  }

  if (tools.fallback[tool]) {
    logPlatformFallbackToolsOnce();
    log.debug("Running platform tool fallback exec cmd "+tools.fallback[tool] + " " + arg.join(" "));
    cp.execFile(tools.fallback[tool], arg, {maxBuffer: 2000*1024}, callbackHook(callback));
    return true;
  }
  log.error("NO PLATFORM TOOL USED!");
  callback(true, false);
  return false;
}

const platfromToolsExecAsar = (tool, callback) => {
  var tools = getPlatformTools();

  // Check first for native
  if (tools[tool]) {
    logPlatformNativeToolsOnce();
    callback({
        exec: (cmd, cb) => {
            log.debug("Running platform tool exec asar cmd "+cmd);
            exec(cmd, (err, e,r) => {
                cb(err,e,r);
            })
        },
        done: () => { console.log("done platform tools") }
    });
    return true;
  }

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
const getPlatformTools = () => {
  var p = getNativePlatfromTools();
  p["fallback"] = getFallbackPlatformTools();
  return p;
}

const getNativePlatfromTools = () => {
  var ret = {};
  if (commandExistsSync("adb"))
    ret["adb"] = "adb";
  if (commandExistsSync("fastboot"))
    ret["fastboot"] = "fastboot";
  return ret;
}

const getFallbackPlatformTools = () => {
    var thisPlatform = os.platform();
    if(!platforms[thisPlatform]) die("Unsuported platform");
    var platfromToolsPath = path.join(__dirname, "/../platform-tools/", platforms[thisPlatform]);
    return {
        fastboot: path.join(platfromToolsPath, maybeEXE(thisPlatform, "fastboot")),
        adb: path.join(platfromToolsPath, maybeEXE(thisPlatform, "adb"))
    }
}

var isSnap = () => {
  return process.env.SNAP_NAME != null
}

var needRoot = () => {
    if (os.platform() === "win32") return false;
    return !process.env.SUDO_UID
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
                log.error("Not existing " + urls[0].path + "/" + path.basename(urls[0].url))
                urls_.push(urls[0]);
                next();
            } else {
                checksumFile(urls[0], (check) => {
                    if (check) {
                        log.info("Exists " + urls[0].path + "/" + path.basename(urls[0].url))
                        next()
                    } else {
                        log.info("Checksum no match " + urls[0].path + "/" + path.basename(urls[0].url))
                        urls_.push(urls[0]);
                        next()
                    }
                })
            }
        })
    }
    check();
}
//
// var decompressTarxzFileOnlyImages = (file, outdir, callback) => {
//   decompress(file, outdir, {
//     plugins: [
//         decompressTarxz()
//    ],
//     filter: (f) => {
//       return file.path.includes("boot.img") || file.path.includes("recovery.img");
//     },
//     strip: 1
//   }).then(() => {
//       callback();
//   });
// }

var checksumFile = (file, callback) => {
    if (!file.checksum) {
        // No checksum so return true;
        callback(true);
        return;
    }
    checksum.file(path.join(file.path, path.basename(file.url)), {
        algorithm: "sha256"
    }, function(err, sum) {
        log.info("checked: " +path.basename(file.url), sum === file.checksum)
        callback(sum === file.checksum, sum)
    })
}

/*
urls format:
[
  {
    url: "http://test.com",
    path: ".bla/bal/",
    checksum: "d342j43lj34hgth324hj32ke4"
  }
]
*/
var downloadFiles = (urls_, downloadEvent, callbackOn) => {
    var urls;
    var totalFiles;
    downloadEvent.emit("download:startCheck");
    var dl = () => {
        if (!fs.existsSync(urls[0].path)) {
            mkdirp.sync(urls[0].path);
        }
        progress(http(urls[0].url))
            .on('progress', (state) => {
                downloadEvent.emit("download:progress", state);
            })
            .on('error', (err) => {
                downloadEvent.emit("download:error", err)
            })
            .on('end', () => {
                fs.rename(path.join(urls[0].path, path.basename(urls[0].url + ".tmp")),
                    path.join(urls[0].path, path.basename(urls[0].url)), () => {
                        downloadEvent.emit("download:checking");
                        checksumFile(urls[0], (check) => {
                            if (Array.isArray(callbackOn)){
                              if (callbackOn.indexOf(urls[0].url) > -1)
                                downloadEvent.emit("download:callbackOn", urls[0].url);
                            }
                            if (check) {
                                if (urls.length <= 1) {
                                    downloadEvent.emit("download:done");
                                } else {
                                    urls.shift();
                                    downloadEvent.emit("download:next", urls.length, totalFiles);
                                    dl()
                                }
                            } else {
                                downloadEvent.emit("download:error", "Checksum did not match on file " + path.basename(urls[0].url));
                            }
                        })
                    })
            })
            .pipe(fs.createWriteStream(path.join(urls[0].path, path.basename(urls[0].url + ".tmp"))));
    }
    checkFiles(urls_, (ret) => {
        if (ret.length <= 0) {
            downloadEvent.emit("download:done");
        } else {
            urls = ret;
            totalFiles = urls.length;
            downloadEvent.emit("download:start", urls.length, totalFiles);
            dl();
        }
    })
    return downloadEvent;
}

module.exports = {
    downloadFiles: downloadFiles,
    checksumFile: checksumFile,
    checkFiles: checkFiles,
    log: log,
    platfromToolsExec: platfromToolsExec,
    platfromToolsExecAsar: platfromToolsExecAsar,
    ensureRoot: ensureRoot,
    isSnap: isSnap,
    getPlatformTools: getPlatformTools,
    getUbportDir: getUbportDir,
    needRoot: needRoot,
    checkPassword: checkPassword,
    debugScreen: debugScreen,
    debugTrigger: debugTrigger,
    createBugReport: createBugReport,
    checkForNewUpdate: checkForNewUpdate,
    getPlatform: getPlatform,
    asarExec: asarExec
//    decompressTarxzFileOnlyImages: decompressTarxzFileOnlyImages
}
