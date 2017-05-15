/*

Fastboot wrapper, part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const path = require("path");
const utils = require("./utils.js")
const fastboot = utils.getPlatformTools().fastboot;

var waitForDevice = (password, callback) => {
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
var flash = (images, callback, password) => {
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
            if (c) {
                if (c.message.includes("incorrect password"))
                    callback({
                        password: true
                    });
                  else callback(true, "Fastboot: Unknown error: " + r.replace(password, "***") + " " + e.replace(password, "***"));
            } else {
                callback(c, r, e)
            }
            asarExec.done();
        })
    });
}

var boot = (image, password, callback) => {
  var cmd="";
  if (utils.needRoot())
      cmd += "echo " + password + " | sudo -S "
  cmd += fastboot + " boot \"" + path.join(image.path, path.basename(image.url)) + "\"";
  utils.asarExec(fastboot, (asarExec) => {
      asarExec.exec(cmd, (c, r, e) => {
          if (c) {
              if (c.message.includes("incorrect password"))
                  callback({
                      password: true
                  });
              else callback(true, "Fastboot: Unknown error: " + r.replace(password, "***") + " " + e.replace(password, "***"));
          } else {
              callback(c, r, e)
          }
          asarExec.done();
      })
  });
}

module.exports = {
    flash: flash,
    waitForDevice: waitForDevice,
    boot: boot
}
