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
const exec = require('child_process').exec;

// DEFAULT = 5037
const PORT = 5038

class event extends events {}

// Since we need root anyway, why not start adb with root
const start = (password, sudo, callback) => {
  // Make sure the server is not running
  stop(err => {
    var cmd="";
    if (utils.needRoot() && sudo)
        cmd += utils.sudoCommand(password);
    cmd += adb + " -P " + PORT + " start-server";
    // Authorize Fairphone 2 vendor ID if necessary
    if (utils.isSnap())
        exec("echo 0x2ae5 > ~/.android/adb_usb.ini");
        
    console.log("Starting: " + cmd);
    utils.platformToolsExecAsar("adb", (platformToolsExecAsar) => {
        platformToolsExecAsar.exec(cmd, (c, r, e) => {
            console.log(c, r, e);
            if (r.includes("incorrect password"))
              callback({
                  password: true
                });
            else
              callback()
            platformToolsExecAsar.done();
        })
    });
  })
}

const stop = (callback) => {
  utils.platformToolsExec("adb", ["kill-server"], (err, stdout, stderr) => {
      var childProcess = utils.platformToolsExec("adb", ["-P", PORT, "kill-server"], (err, stdout, stderr) => {
        console.log(stdout)
      })
      childProcess.on('exit', (code, signal) => {
          if(0 == code)  {
              callback();
          }else{
             callback(false);
          }
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
    "PRO5": "turbo"
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
  shell("getprop ro.product."+method, (output) => {
    if (output.includes("getprop: not found")){
      utils.log.debug("getprop: not found")
      getDeviceNameFromPropFile(callback);
      return;
    }
    if (output === null) {
      util.log.debug("getprop: error");
      callback(false);
      return;
    }
    utils.log.debug( "getprop: " + output.replace(/\W/g, ""))
    callback(output.replace(/\W/g, ""));
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
  var fileSize = fs.statSync(file)["size"];
 
  var childProcess = utils.platformToolsExec("adb", ["-P", PORT, "push", "'" + file.replace("'","\'") + "'", dest], (err, stdout, stderr) => {}, null);
  var buffer = "";
  var regex = /\[([^%]+)%\].*/g;
  //var stdoutListeners = process.stdout.listeners('data');
  //process.stdout.removeAllListeners('data');
  
  var oldmatch = "";
  childProcess.stdout.on('data', (data) => {
	buffer += data.toString();
	var match;
	while((null !== (match = regex.exec(buffer))) && (match.length > 0)) {
		var tmp = match[1].trim();
		if(tmp !== oldmatch) {
			pushEvent.emit("adbpush:progress", match[1]);
			oldmatch = tmp;
		}
		buffer = buffer.substring(regex.lastIndex);
	}
	//utils.log.debug("BUFFER: " + buffer.toString());
  });

  //childProcess.stderr.on('data', (data) => {
  //  utils.log.error("ERR: " + data);
  //});
  
  childProcess.on('exit', (code, signal) => {
	  //utils.log.debug("restored " + stdoutListeners);
	  if(0 == code) {
		pushEvent.emit("adbpush:end");
	  }else{
		pushEvent.emit("adbpush:error", "processing '" + file + "' exited with code " + code + " and signal " + signal);
	  }
  });
  return pushEvent;
}

var shell = (cmd, callback) => {
    var arg = ["-P", PORT, "shell", cmd];
    utils.platformToolsExecAsar("adb", (asarExec) => {
        var ret = asarExec.execSync("adb " + arg.join(" "));
        if(null == ret.ex || undefined == ret.ex) {
            //utils.log.debug("adb " + arg.join(" ") + " successful " + ret.out);
            callback(ret.out + "");
        }else{
            callback(false);
        }
    });
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
  shell("echo 1 &> /dev/null", (r) => {
    callback(r);
  })
}

var reboot = (state, callback) => {
  utils.log.debug("reboot to "+state);
  var arg = ["-P", PORT, "reboot", state];
  utils.platformToolsExecAsar("adb", (asarExec) => {
        var ret = asarExec.execSync("adb " + arg.join(" "));
        if(null == ret.ex || undefined == ret.ex) {
            utils.log.debug(arg.join(" ") + " successful " + ret.out);
            callback(false);
        }else{
			callback(true, stdout, stderr);
        }
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
