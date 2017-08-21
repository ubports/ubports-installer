/*

Fastboot wrapper, part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const path = require("path");
const utils = require("./utils.js")
const fastboot = utils.getPlatformTools().fastboot;

const lockedErrors = ["unlocked", "locked", "oem-lock", "lock"]


var isLocked = (message) => {
  var locked = false;
  lockedErrors.forEach((l) => {
    if (message.includes(l)){
      locked = true;
      return true;
    }
  })
  return locked;
}

var handleError = (c, r, e, password, callback) => {
  if (c) {
      if (c.message.includes("incorrect password"))
          callback({
              password: true
          });
      else if (isLocked(c.message))
          callback({
            locked: true
          })
        else callback(true, "Fastboot: Unknown error: " + r.replace(password, "***") + " " + e.replace(password, "***"));
  } else {
      callback(c, r, e)
  }
}

/*

args; string, function

*/
var waitForDevice = (password, callback) => {
    utils.log.debug("fastboot: wait for device");
    var cmd = "";
    if (utils.needRoot())
        cmd += "echo " + password + " | sudo -S "
    cmd += fastboot + " devices";
    var stop;
    utils.asarExec(fastboot, (asarExec) => {
        var repeat = () => {
            asarExec.exec(cmd, (err, r, e) => {
                if (r) {
                    if (r.includes("incorrect password"))
                        callback(true, {
                            password: true
                        });
                    else if (r.includes("fastboot")) {
                        callback(false);
                        asarExec.done();
                    }else {
                        // Unknown error;
                        utils.log.error("Fastboot: Unknown error: " + r.replace(password, "***") + " " + e.replace(password, "***"));
                        callback(true, "Fastboot: Unknown error: " + r.replace(password, "***") + " " + e.replace(password, "***"));
                    }
                    return;
                } else {
                    setTimeout(() => {
                        if (!stop) repeat();
                        else asarExec.done();
                    }, 5000)
                }
            })
        }
        repeat();
    });
    return {
        stop: () => {
            stop = true;
        }
    };
}

// Due to limitations with sudo we combind the sudo.exec to one call to prevent
// seperate password prompts
/*

args; array(object), string, function

image object format
[
 {
  path: string, | path of file
  url: string, | url to extract filename
  type: string | partition to flash
 }
]

*/
var flash = (images, callback, password) => {
    utils.log.debug("fastboot: flash; " + images);
    var cmd = "";
    images.forEach((image, l) => {
        if (utils.needRoot())
            cmd += "echo " + password + " | sudo -S "
        cmd += fastboot + " flash " + image.type + " \"" + path.join(image.path, path.basename(image.url)) + "\"";
        if (l !== images.length - 1)
            cmd += " && "
    });
    utils.asarExec(fastboot, (asarExec) => {
        asarExec.exec(cmd, (c, r, e) => {
            handleError(c, r, e, password, callback);
            asarExec.done();
        })
    });
}

/*

args; array(object), string, function

image object format
[
 {
  path: string, | path of file
  url: string | url to extract filename
 }
]

*/
var boot = (image, password, callback) => {
  var cmd="";
  if (utils.needRoot())
      cmd += "echo " + password + " | sudo -S "
  cmd += fastboot + " boot \"" + path.join(image.path, path.basename(image.url)) + "\"";
  utils.asarExec(fastboot, (asarExec) => {
      asarExec.exec(cmd, (c, r, e) => {
          handleError(c, r, e, password, callback);
          asarExec.done();
      })
  });
}
/*

args; array, string, function

*/
var format = (partitions, password, callback) => {
  var cmd="";
  partitions.forEach((partition, l) => {
      if (utils.needRoot())
          cmd += "echo " + password + " | sudo -S "
      cmd += fastboot + " format " + partition;
      if (l !== partitions.length - 1)
          cmd += " && "
  });
  utils.asarExec(fastboot, (asarExec) => {
      asarExec.exec(cmd, (c, r, e) => {
          handleError(c, r, e, password, callback);
          asarExec.done();
      })
  });
}

/*

args; array, string, function

*/
var oem = (command, password, callback) => {
  var cmd="";
  if (utils.needRoot())
      cmd += "echo " + password + " | sudo -S "
  cmd += fastboot + " oem " + command;
  utils.asarExec(fastboot, (asarExec) => {
      asarExec.exec(cmd, (c, r, e) => {
          handleError(c, r, e, password, callback);
          asarExec.done();
      })
  });
}

/*

args; string, function

*/
var oemUnlock = (password, callback) => {
  oem("unlock", password, callback);
}

module.exports = {
    flash: flash,
    waitForDevice: waitForDevice,
    boot: boot,
    format: format,
    oem: oem,
    oemUnlock: oemUnlock
}
