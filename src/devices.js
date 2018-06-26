"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const http = require("request");
const adb = require("./adb");
const fastboot = require("./fastboot");
const systemImage = require("./system-image");
const utils = require("./utils");
const os = require("os");
const path = require("path");
const events = require("events")
const fEvent = require('forward-emitter');
//const wildcard = require("wildcard");

class event extends events {}

const ubportsApi = "https://devices.ubports.com/";
const downloadPath = utils.getUbuntuTouchDir();

var password;

var getDevices = (callback) => {
    http.get({
        url: ubportsApi + "api/installer/devices",
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    })
}

var postSuccess = (info, callback) => {
    http.post({
        url: ubportsApi + "api/installer/success",
        json: true,
        body: info
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    })
}

var getDevice = (device, callback) => {
    http.get({
        url: ubportsApi + "api/device/" + device,
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod, device);
        else callback(false, device);
    })
}

var getInstallInstructs = (device, callback) => {
    http.get({
        url: ubportsApi + "api/installer/" + device,
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    }).o
}

var getNotWorking = (ww) => {
    if (!ww) return false;
    var notWorking = [];
    var whatsWorking = JSON.parse(ww);
    for (var i in whatsWorking) {
        if (whatsWorking[i] === 1)
            notWorking.push(i);
    }
    if (whatsWorking.length === 0)
        return false;
    return notWorking;
}

var formatNotWorking = (nw) => {
    if (!nw) return false;
    return nw.join(", ").replace("/\,(?=[^,]*$)", " and");
}

var instructReboot = (state, button, rebootEvent, callback) => {
    adb.hasAdbAccess((hasAccess) => {
        if (hasAccess) {
            adb.reboot(state, (err, out, eout) => {
                if (err) {
                  utils.log.warn("Adb failed to reboot!, " + out + " : " + eout);
                  utils.log.info("Instructing manual reboot");
                  rebootEvent.emit("user:reboot", {
                      button: button[state],
                      state: state
                  });
                } else {
                  rebootEvent.emit("adb:rebooted");
                }
            });
        } else {
            utils.log.info("Instructing manual reboot");
            rebootEvent.emit("user:reboot", {
                button: button[state],
                state: state
            });
        }
        if (state === "bootloader") {
            requestPassword(rebootEvent, (pass) => {
                fastboot.waitForDevice(pass, (err, errM) => {
                    if (err){
                        rebootEvent.emit("Error", errM);
                        return;
                    }
                    rebootEvent.emit("reboot:done");
                    rebootEvent.emit("state:bootloader");
                    callback();
                })
            });
        } else {
            adb.waitForDevice(() => {
                // We expect the device state to mach installState now
                    rebootEvent.emit("reboot:done");
                    rebootEvent.emit("state:" + state);
                    callback()
            });
        }
    })
}

var requestPassword = (bootstrapEvent, callback) => {
    if(!utils.needRoot()){
      callback("");
      return;
    } else if(process.env.SUDO_ASKPASS){
        callback("");
        return;
    } else if(password){
        callback(password);
        return;
    }

    bootstrapEvent.emit("user:password");
    bootstrapEvent.once("password", (p) => {
        utils.checkPassword(p, (correct, err) => {
            if(correct){
                password=p;
                callback(p);
            }else if (err.password) {
              bootstrapEvent.emit("user:password:wrong");
              requestPassword(bootstrapEvent, callback);
            }else {
              bootstrapEvent.emit("error", err.message)
            }
        })
    });
}

var instructOemUnlock = (unlockEvent, callback) => {
  requestPassword(unlockEvent, (p) => {
    fastboot.oemUnlock(password, (err, errM) => {
      if (err){
        unlockEvent.emit("error", errM)
        callback(true)
      }else
        callback(false)
    });
  })
}

var handleBootstrapError = (err, errM, bootstrapEvent, backToFunction) => {
  if(err.password)
      bootstrapEvent.emit("user:password:wrong", backToFunction);
  else if (err.locked)
      bootstrapEvent.emit("user:oem-lock", backToFunction);
   else
      bootstrapEvent.emit("error", errM)
}

var instructBootstrap = (fastbootboot, images, bootstrapEvent) => {
    //TODO check bootloader name/version/device
    var flash = (p) => {
        var recoveryImg = null;
        var bootImg = null;
        images.forEach((image) => {
          if (recoveryImg == null && image.type == "recovery")
            recoveryImg = image;
          else if (bootImg == null && image.type == "boot")
            bootImg = image;
          else
            bootstrapEvent.emit("error", "Unknown or duplicate image type: "+image.type);
          return;
        });
        if(bootImg == null || recoveryImg == null) {
            bootstrapEvent.emit("error", "Missing " + (bootImg == null ? "boot" : "recovery") + " image.");
            return;
        }
        fastboot.flash(bootImg, (err, errM) => {
            if(err) {
              utils.log.error("error while flashing boot image, retrying");
              handleBootstrapError(err, errM, bootstrapEvent, () => {
                instructBootstrap(fastbootboot, images, bootstrapEvent);
                return;
              });
            } else {
              fastboot.flash(recoveryImg, (err, errM) => {
                  if(err) {
                    utils.log.error("error while flashing recovery image, retrying");
                    handleBootstrapError(err, errM, bootstrapEvent, () => {
                      instructBootstrap(fastbootboot, images, bootstrapEvent);
                    });
                  } else {
                    if (fastboot) {
                      utils.log.info("Booting into recovery image...");
                      // If we can't find it, report error!
                      fastboot.boot(recoveryImg, p, (err, errM) => {
                        if (err) {
                          handleBootstrapError(err, errM, bootstrapEvent, () => {
                            instructBootstrap(fastbootboot, images, bootstrapEvent);
                          });
                        } else {
                          bootstrapEvent.emit("bootstrap:done", fastbootboot);
                        }
                      })
                    } else {
                      bootstrapEvent.emit("bootstrap:done", fastbootboot)
                    }
                  }
              });
            }
        }, p)
    }
    bootstrapEvent.emit("bootstrap:flashing")
    bootstrapEvent.emit("user:write:status", "Flashing images")
    if (!utils.needRoot()) {
        flash(false);
    }else {
        requestPassword(bootstrapEvent, (p) => {
            flash(p);
        });
    }
}

var getInstallSettings = (instructs, setting) => {
    if (instructs.install_settings[setting])
        return instructs.install_settings[setting]
    return false;
}

var addPathToImages = (instructs, device) => {
    var images = [];
    instructs.images.forEach((image) => {
        image["path"] = path.join(downloadPath, "images", device);
        images.push(image);
    })
    return images;
}

var setEvents = (downloadEvent) => {
  downloadEvent.on("download:done", () => {
    utils.log.info("Download complete");
  });
  downloadEvent.on("download:error", (r) => {
    utils.log.error("Devices: Download error "+r);
  });
  downloadEvent.on("error", (r) => {
    downloadEvent.emit("user:error", r);
    utils.log.error("Devices: Error: "+r);
  });
  downloadEvent.on("download:checking", () => {
    utils.log.info("Download checking file");
  });
  downloadEvent.on("download:startCheck", () => {
    downloadEvent.emit("user:write:status", "Checking Ubuntu Touch files");
    utils.log.info("Download startCheck");
  });
  downloadEvent.on("download:start", (i, t) => {
    utils.log.info("Starting download of "+i+" files");
    downloadEvent.emit("user:write:status", "Downloading Ubuntu Touch");
    downloadEvent.emit("user:write:next", "Downloading", i, t);
  });
  downloadEvent.on("download:next", (i, t) => {
    utils.log.info(`Downloading next file, ${i} left, ${t} total`);
    downloadEvent.emit("user:write:next", "Downloading", i, t);
  });
  downloadEvent.on("download:progress", (i) => {
    utils.log.info(`Downloading file, ${Math.ceil(i.percent*100)}% complete`);
    downloadEvent.emit("user:write:progress", Math.ceil(i.percent*100));
  });
  downloadEvent.on("adbpush:done", () => {
    utils.log.info("Done pushing files");
    utils.log.info("Rebooting to recovery to flash");
    downloadEvent.emit("system-image:done");
    downloadEvent.emit("user:write:status", "Rebooting to recovery to start the flashing process");
    downloadEvent.emit("user:write:done");
  });
  downloadEvent.on("adbpush:error", (e) => {
    downloadEvent.emit("error", "Adb push error: " + e)
    utils.log.error("Devices: Adb push error: "+ e)
  });
  downloadEvent.on("adbpush:progress", (r) => {
    utils.log.info("ADB push "+r+"%");
    downloadEvent.emit("user:write:progress", r);
  });
  downloadEvent.on("adbpush:next", (r, t) => {
    utils.log.info("Start pushing next file, " + r + " files left")
    downloadEvent.emit("user:write:next", "Pushing", r, t);
  });
  downloadEvent.on("adbpush:start", (r) => {
    utils.log.info("Start pushing "+r+" files")
    downloadEvent.emit("user:write:status", "Pushing files to device");
    downloadEvent.emit("user:write:start", "Pushing", r);
  });
}

var install = (options) => {
    if (!options)
      return false;
    const installEvent = new event();
    getInstallInstructs(options.device, (instructs) => {
        if (!options.noUserEvents)
          setEvents(installEvent);
        installEvent.on("images:startDownload", () => {
            installEvent.emit("user:write:status", "Downloading images");
            utils.downloadFiles(addPathToImages(instructs, options.device), installEvent)
        })
        installEvent.on("system-image:start", () => {
          if(!options.noSystemImage)
            systemImage.installLatestVersion({
              device: options.device,
              channel: options.channel,
              event: installEvent,
              wipe: options.wipe
            });
        })
        installEvent.on("system-image:done", () => {
            instructReboot("recovery", instructs.buttons, installEvent, () => {
              installEvent.emit("install:done");
              postSuccess({
                device: options.device,
                channel: options.channel
              }, () => {});
            });
        })
        installEvent.on("bootstrap:done", (fastbootboot) => {
            utils.log.info("bootstrap done");
            if (!fastbootboot){
              instructReboot("recovery", instructs.buttons, installEvent, () => {
                  installEvent.emit("system-image:start")
              });
            } else {
              installEvent.emit("user:write:status", "Waiting for device to enter recovery mode");
              adb.waitForDevice(() => {
                installEvent.emit("system-image:start");
              })
            }
        })
        if (getInstallSettings(instructs, "bootstrap")) {
            // We need to be in bootloader
            instructReboot("bootloader", instructs.buttons, installEvent, () => {
                installEvent.once("download:done", () => {
                  utils.log.info("done downloading(once listener)");
                  instructBootstrap(getInstallSettings(instructs, "fastbootboot"), addPathToImages(instructs, options.device), installEvent)
                })
                installEvent.emit("images:startDownload")
            });
        } else {
            // We need to be in recovery
            instructReboot("recovery", instructs.buttons, installEvent, () => {
                installEvent.emit("system-image:start")
            });
        }
    });
    return installEvent;
}

var getChannelSelects = (device, callback) => {
  var channelsAppend = [];
  systemImage.getDeviceChannels(device).then((channels) => {
    getInstallInstructs(device, (ret) => {
      if (ret) {
        channels.forEach((channel) => {
          var _channel = channel.replace("ubports-touch/", "");
          // Ignore blacklisted channels
          if (ret["system_server"]["blacklist"].indexOf(channel) > -1)
            return;
          if (channel === ret["system_server"]["selected"])
            channelsAppend.push("<option value="+channel+" selected>" + _channel + "</option>");
          else
            channelsAppend.push("<option value="+channel+">" + _channel + "</option>");
        });
        callback(channelsAppend.join(''));
      } else {
        callback(false);
      }
    });
  });
}

module.exports = {
    getDevice: getDevice,
    waitForDevice: (callback) => {
        var waitEvent = adb.waitForDevice(() => {
            adb.getDeviceName((name) => {
                // Have a small delay here, without this it seems to trigger
                // some prevent_dual_callback function in "requests"
                setTimeout(function () {
                    getDevice(name, (ret) => {
                        if (!ret){
                          callback(false, name);
                          return;
                        }
                        // Have a small delay here, without this it seems to trigger
                        // some prevent_dual_callback function in "requests"
                        setTimeout(() => {
                            getChannelSelects(ret.device.device, (channels) => {
                                adb.isBaseUbuntuCom(ubuntuCom => {
                                  console.log(ubuntuCom);
                                  callback(ret, device, channels, ubuntuCom);
                                });
                            })
                        }, 10);
                    });
                }, 10);
            })
        })
        waitEvent.on("device:select", (device) => {
            waitEvent.emit("stop");
            getDevice(device, (ret) => {
                if (ret) {
                    getChannelSelects(ret.device.device, (channels) => {
                        callback(ret, ret.device.device, channels);
                    });
                } else {
                    callback(false, name);
                }
            });
        })
        return waitEvent;
    },
    getInstallInstructs: getInstallInstructs,
    getNotWorking: getNotWorking,
    formatNotWorking: formatNotWorking,
    install: install,
    getFormatedNotWorking: (ww) => {
        return formatNotWorking(getNotWorking(ww));
    },
    getDeviceSelects: (callback) => {
        getDevices((devices) => {
          if (devices) {
            var devicesAppend = [];
            devices.sort(function(a, b){
              var y = a.name.toLowerCase();
              var x = b.name.toLowerCase();
              if (x < y) {return 1;}
              if (x > y) {return -1;}
              return 0;
            });
            devices.forEach((device) => {
              devicesAppend.push("<option name=\"" + device.device + "\">" + device.name + "</option>");
            });
            utils.log.debug("Successfully downloaded devices list");
            callback(devicesAppend.join(''));
          } else {
            callback(false);
          }
        })
    },
    getChannelSelects: getChannelSelects,
    instructOemUnlock: instructOemUnlock
}
