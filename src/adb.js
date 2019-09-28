"use strict";

/*

Adb wrapper, part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const sys = require('util')
const cp = require('child_process');
const path = require("path");
const fs = require("fs");
const utils = require("./utils");
const exec = require('child_process').exec;

// DEFAULT = 5037
const PORT = 5037

// Since we need root anyway, why not start adb with root
const start = (password, sudo, callback) => {
  // Make sure the server is not running
  stop(err => {
    var cmd="";
    if (utils.needRoot() && sudo)
        cmd += utils.sudoCommand(password);
    cmd += "adb -P " + PORT + " start-server";
    // HACK: Authorize Fairphone 2 vendor ID if necessary
    if (utils.isSnap())
        exec("echo 0x2ae5 > ~/.android/adb_usb.ini");
    utils.platformToolsExecAsar("adb", (platformToolsExecAsar) => {
        platformToolsExecAsar.exec(cmd, (c, r, e) => {
            if (r.includes("incorrect password"))
              callback({
                  password: true
              });
            else
              callback();
            platformToolsExecAsar.done();
        });
    });
  });
}

const stop = (callback) => {
  utils.log.debug("Killing all running adb servers...")
  utils.platformToolsExec("adb", ["kill-server"], (err, stdout, stderr) => {
      utils.platformToolsExec("adb", ["-P", PORT, "kill-server"], (err, stdout, stderr) => {
        // console.log(stdout)
        if (err !== null) callback(false);
        else callback();
      });
  });
}

// TODO: remove lazy override alias, this should be handled by the server
// NOT localy.
const lazyOverrideAlias = (func, arg, callback) => {
  var alias = {
    "A0001": "bacon",
    "a0001": "bacon",
    "find7op": "bacon",
    "nexus5": "hammerhead",
    "fairphone2": "FP2",
    "PRO5": "turbo",
    "mx4": "arale",
    "Aquaris_E45": "krillin",
    "Aquaris_E5": "vegetahd",
    "Aquaris_M10HD": "cooler",
    "Aquaris_M10FHD": "frieza"
  }
  func(device => {
    if (device in alias)
      callback(alias[device]);
    else
      callback(device);
  }, arg)
}

var getDeviceNameFromPropFile = (callback) => {
  shell("cat default.prop", (output) => {
    output=output.split("\n");
    var ret;
    output.forEach((prop) => {
      if (prop.includes("ro.product.device") && prop !== undefined && !ret){
        ret = prop.split("=")[1];
      }
    });
    callback(ret.replace(/\W/g, ""));
  });
}

var _getDeviceName = (callback, method) => {
  if (!method) method = "device";
  shell("getprop ro.product."+method, (stdout) => {
    if (!stdout) {
      utils.log.debug("getprop: error");
      callback(false);
      return;
    } else if (stdout.includes("getprop: not found")){
      utils.log.debug("getprop: not found")
      getDeviceNameFromPropFile(callback);
      return;
    }
    utils.log.debug("getprop: "+stdout.replace(/\W/g, ""))
    callback(stdout.replace(/\W/g, ""));
  });
}

var getDeviceName = (callback, method) => {
  lazyOverrideAlias(_getDeviceName, method, callback)
}

var isUbuntuDevice = (callback) => {
  shell("cat /etc/system-image/channel.ini", (output) => {
    callback(output ? true : false);
  });
}

var readUbuntuChannelINI = (callback) => {
  shell("cat /etc/system-image/channel.ini", (output) => {
    if (!output)
      return callback(false);
    if (!output.startsWith("[service]"))
      return callback(false);
    var ret = {};
    output.split("\n").forEach(line => {
      if (!line.includes(": "))
        return;
      var split = line.replace("\r", "").split(": ");
      ret[split[0]] = split[1];
    });
    callback(ret);
  })
}

var isBaseUbuntuCom = callback => {
  readUbuntuChannelINI(ini => {
    if (!ini)
      return callback(false);
    callback(ini.base.includes("system-image.ubuntu.com"))
  });
}

var push = (file, dest) => {
  return new Promise(function(resolve, reject) {
    var done;
    var hundredEmitted;
    var fileSize = fs.statSync(file)["size"];
    var lastSize = 0;
    var progressInterval = setInterval(() => {
      shell("stat -t " + dest + "/" + path.basename(file), (stat) => {
        mainEvent.emit("adbpush:progress:size", eval(stat.split(" ")[1])-lastSize);
        lastSize = eval(stat.split(" ")[1]);
      });
    }, 1000);
    var guardedfile = process.platform == "darwin" ? file : '"' + file + '"'; // macos can't handle double quotes
    utils.platformToolsExec("adb", ["-P", PORT, "push", guardedfile, dest], (err, stdout, stderr) => {
      done=true;
      if (err) {
        var stdoutShort = stdout && stdout.length > 256 ? "[...]" + stdout.substr(-256, stdout.length) : stdout;
        var stderrShort = stderr && stderr.length > 256 ? "[...]" + stderr.substr(-256, stderr.length) : stderr;
        if (stderrShort.indexOf("I/O error") != -1) {
          utils.log.warn("connection to device lost");
          // TODO: Only restart the event rather than the entire installation
          mainEvent.emit("user:connection-lost", () => { mainEvent.emit("restart"); });
        } else if (!err.killed && (err.code == 1)) {
          hasAdbAccess ((hasAccess) => {
            if (hasAccess) {
              utils.errorToUser(err + ", stdout: " + stdoutShort + ", stderr: " + stderrShort, "ADB push");
            } else {
              utils.log.warn("connection to device lost");
              // TODO: Only restart the event rather than the entire installation
              mainEvent.emit("user:connection-lost", () => { mainEvent.emit("restart"); });
            }
          });
        } else {
          utils.errorToUser(err + ", stdout: " + stdoutShort + ", stderr: " + stderrShort, "ADB push");
        }
      }
      clearInterval(progressInterval);
      resolve();
    });
  });
}

var pushMany = (files) => {
  try {
    if (files.length <= 0){
      utils.errorToUser("No files provided", "ADB push");
      return false;
    }
    var totalSize = 0;
    var downloadedSize = 0;
    // Get total size for progress bar
    files.forEach((file) => {
      try {
        totalSize += fs.statSync(file.src)["size"];
      } catch (e) {
        throw "Can't read system-image files: " + e
      }
    });
    mainEvent.emit("user:write:working", "push");
    mainEvent.once("adbpush:done", () => {
      mainEvent.emit("adbpush:progress", 1);
    })
    mainEvent.on("adbpush:progress:size", (s) => {
      downloadedSize += s;
      mainEvent.emit("adbpush:progress", downloadedSize/totalSize);
    });
    // Push it to the limit
    function pushNext(i) {
      utils.log.debug("Pushing file " + (i+1) + " of " + files.length);
      push(files[i].src, files[i].dest).then(() => {
        if (i+1 < files.length) {
          pushNext(i+1);
        } else {
          mainEvent.emit("adbpush:done");
        }
      });
    }
    pushNext(0); // Begin pushing
  } catch (e) {
    utils.errorToUser(e, "ADB PushMany")
  }
}

var shell = (cmd, callback) => {
  if (!cmd.startsWith("stat")) utils.log.debug("adb shell: "+cmd);
  utils.platformToolsExec("adb", ["-P", PORT, "shell", cmd], (err, stdout, stderr) => {
    if (err) callback(false);
    else callback(stdout);
  });
}

var waitForDevice = (callback) => {
  let timer = setInterval(() => {
    shell("echo 1", (r) => {
      if(r){
        clearInterval(timer);
        callback(true);
        return;
      }
    });
  }, 2000);
  mainEvent.on("stop", () => {
    clearInterval(timer);
  });
}

var hasAdbAccess = (callback) => {
  shell("echo 1", (r) => {
    callback(r);
  })
}

var reboot = (state, callback) => {
  utils.log.debug("reboot to "+state);
  utils.platformToolsExec("adb", ["-P", PORT, "reboot", state], (err, stdout, stderr) => {
    utils.log.debug("reboot to " + state + " done");
    if (stdout.includes("failed")) callback(true, stdout, stderr);
    else if (stderr.includes("failed")) callback(true, stdout, stderr);
    else if (err !== null) callback(true, stdout, stderr);
    else callback(false);
  });
}

var format = (partition, callback) => {
  shell("cat /etc/recovery.fstab", (fstab_) => {
    if (!fstab_) {
      callback(false, "cannot find recovery.fstab");
      return;
    }
    var fstab = fstab_.split("\n");
    var block;
    fstab.forEach((fs) => {
      if (!fs.includes(partition) || block)
        return;
      block = fs.split(" ")[0];
      if (!block.startsWith("/dev"))
        block=false;
    })
    if (!block) {
      callback(false, "cannot find partition: "+partition);
      return;
    }
    shell("umount /"+partition, () => {
      shell("make_ext4fs " + block, (ret) => {
        shell("mount /"+partition, () => {
          if (ret)
            callback(false, "failed to wipe "+partition)
          else
            callback(true);
        })
      });
    })
  })
}

var wipeCache = (callback) => {
  // Try with format;
  format("cache", (err) => {
    if (!err){
      callback(true);
      return;
    }

    // If format failed, just rm the contents of cache;
    shell("rm -rf /cache/*", callback);
  })
}

module.exports = {
  waitForDevice: waitForDevice,
  shell: shell,
  getDeviceName: getDeviceName,
  push: push,
  pushMany: pushMany,
  hasAdbAccess: hasAdbAccess,
  reboot: reboot,
  getDeviceNameFromPropFile: getDeviceNameFromPropFile,
  isUbuntuDevice: isUbuntuDevice,
  readUbuntuChannelINI: readUbuntuChannelINI,
  format: format,
  wipeCache: wipeCache,
  isBaseUbuntuCom, isBaseUbuntuCom,
  start: start,
  stop: stop
}
