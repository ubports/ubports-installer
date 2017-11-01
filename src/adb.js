"use strict";

/*

Adb wrapper, part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const sys = require('util')
const cp = require('child_process');
const path = require("path");
const fs = require("fs");
const events = require("events")
const fEvent = require('forward-emitter');
const utils = require("./utils");
const adb = utils.getPlatformTools().adb

// DEFAULT = 5037
const PORT = 5038

class event extends events {}

// Since we need root anyway, why not start adb with root
const start = (password, sudo, callback) => {
  // Make sure the server is not running
  stop(err => {
    var cmd="";
    if (utils.needRoot() && sudo)
        cmd += "echo " + password + " | sudo -S "
    cmd += adb + " -P " + PORT + " start-server";
    utils.asarExec(adb, (asarExec) => {
        asarExec.exec(cmd, (c, r, e) => {
            console.log(c, r, e);
            if (r.includes("incorrect password"))
              callback({
                  password: true
                });
            else
              callback()
            asarExec.done();
        })
    });
  })
}

const stop = (callback) => {
  cp.execFile(adb, ["kill-server"], (err, stdout, stderr) => {
      cp.execFile(adb, ["-P", PORT, "kill-server"], (err, stdout, stderr) => {
        console.log(stdout)
        if (err !== null) callback(false);
        else callback();
      })
  })

}

// TODO: remove lazy override alias, this should be handled by the server
// NOT localy.
const lazyOverrideAlias = (func, arg, callback) => {
  var alias = {
    "A0001": "bacon",
    "a0001": "bacon",
    "find7op": "bacon",
    "nexus5": "hammerhead",
    "fairphone2": "FP2"
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
    })
    callback(ret.replace(/\W/g, ""));
  })
}

var _getDeviceName = (callback, method) => {
  if (!method) method = "device";
  shell("getprop ro.product."+method, (stdout) => {
    if (stdout.includes("getprop: not found")){
      utils.log.debug("getprop: not found")
      getDeviceNameFromPropFile(callback);
      return;
    }
    if (stdout === null) {
      util.log.debug("getprop: error");
      callback(false);
      return;
    }
    utils.log.debug("getprop: "+stdout.replace(/\W/g, ""))
    callback(stdout.replace(/\W/g, ""));
  });
}

var getDeviceName = (callback, method) => lazyOverrideAlias(_getDeviceName, method, callback)

var isUbuntuDevice = (callback) => {
  shell("cat /etc/system-image/channel.ini", (output) => {
    callback(output ? true : false);
  })
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
  if (process.env.FORCE_SWITCH)
    return callback(true);
  readUbuntuChannelINI(ini => {
    if (!ini)
      return callback(false);
    callback(ini.base.includes("system-image.ubuntu.com"))
  });
}

var push = (file, dest, pushEvent) => {
  var done;
  var fileSize = fs.statSync(file)["size"];
  cp.execFile(adb, ["-P", PORT, "push", file, dest], {maxBuffer: 2000*1024}, (err, stdout, stderr) => {
    done=true;
    if (err !== null) {
      pushEvent.emit("adbpush:error", err+" stdout: " + stdout.length > 50*1024 ? "overflow" : stdout + " stderr: " + stderr.length > 50*1024 ? "overflow" : stderr)
      console.log(stdout.length > 50*1024 ? "overflow" : stdout + " stderr: " + stderr.length > 50*1024 ? "overflow" : stderr)
    }
    else pushEvent.emit("adbpush:end")
  });
  var progress = () => {
    setTimeout(function () {
     shell("stat -t "+dest+"/"+path.basename(file)+" |awk '{print $2}'", (currentSize) => {
       pushEvent.emit("adbpush:progress", Math.ceil((currentSize/fileSize)*100))
       if(!done)
        progress();
     })
   }, 1000);
  }
  progress();
  return pushEvent;
}

var pushMany = (files, pushManyEvent) => {
  var totalLenght = files.length;
  if (files.length <= 0){
    pushManyEvent.emit("adbpush:error", "No files provided");
    return false;
  }
  pushManyEvent.emit("adbpush:start", files.length);
  push(files[0].src, files[0].dest, pushManyEvent);
  pushManyEvent.on("adbpush:end", () => {
        files.shift();
        if (files.length <= 0){
          pushManyEvent.emit("adbpush:done");
          return;
        }
        pushManyEvent.emit("adbpush:next", files.length, totalLenght)
        push(files[0].src, files[0].dest, pushManyEvent);
  })
  return pushManyEvent
}

var shell = (cmd, callback) => {
  if (!cmd.startsWith("stat")) utils.log.debug("adb shell: "+cmd);
  cp.execFile(adb, ["-P", PORT, "shell", cmd], (err, stdout, stderr) => {
    if (err !== null) callback(false);
    else callback(stdout);
  })
}

var waitForDevice = (callback) => {
  var stop;
  var waitEvent = new event();
  var repeat = () => {
    shell("echo 1", (r) => {
      if(r){
        callback(true)
      }else {
        setTimeout(() => {
          if(!stop) repeat();
        }, 1000)
      }
    })
  }
  repeat();
  waitEvent.on("stop", () => {
    stop=true;
  });
  return waitEvent;
}

var hasAdbAccess = (callback) => {
  shell("echo 1", (r) => {
    callback(r);
  })
}

var reboot = (state, callback) => {
  utils.log.debug("reboot to "+state);
  cp.execFile(adb, ["-P", PORT, "reboot", state], (err, stdout, stderr) => {
    utils.log.debug("reboot to "+state+ " [DONE] err:" + err+stdout+stderr);
    console.log(stderr)
    if (stdout.includes("failed")) callback(true, stdout, stderr)
    else if (stderr.includes("failed")) callback(true, stdout, stderr)
    else if (err !== null) callback(true, stdout, stderr);
    else callback(false);
  })
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
