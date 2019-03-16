"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const http = require("request");
const ubportsApi = require("ubports-api-node-module");
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

const devicesApi = new ubportsApi.Devices();
const downloadPath = utils.getUbuntuTouchDir();

var password;

// HACK: This should be handled by the server, not locally
var isLegacyAndroid = (device) => {
  switch (device) {
    case "krillin":
    case "vegetahd":
    case "cooler":
    case "frieza":
    case "turbo":
    case "arale":
      console.log("This is a legacy android device")
      return true;
    default:
      console.log("This is NOT a legacy android device")
      return false;
  }
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
                  utils.log.info(button[state]["button"]);
                  rebootEvent.emit("user:reboot", {
                      button: button[state]["button"],
                      instruction: button[state]["instruction"],
                      state: state
                  });
                } else {
                  rebootEvent.emit("adb:rebooted");
                }
            });
        } else {
            utils.log.info("Instructing manual reboot");
            utils.log.info(button[state]["button"]);
            rebootEvent.emit("user:reboot", {
                button: button[state]["button"],
                instruction: button[state]["instruction"],
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
    }
    if(password){
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
        fastboot.flash(images, (err, errM) => {
            if(err)
              handleBootstrapError(err, errM, bootstrapEvent, () => {
                instructBootstrap(fastbootboot, images, bootstrapEvent);
              });
            else {
              if (fastboot) {
                  utils.log.info("Booting into recovery image...");
                  // find recovery image
                  var recoveryImg;
                  images.forEach((image) => {
                    if (image.type === "recovery")
                      recoveryImg = image;
                  });
                  // If we can't find it, report error!
                  if (!recoveryImg){
                    bootstrapEvent.emit("error", "Cant find recoveryImg to boot: "+images);
                  }else {
                    fastboot.boot(recoveryImg, p, (err, errM) => {
                      if (err) {
                        handleBootstrapError(err, errM, bootstrapEvent, () => {
                          instructBootstrap(fastbootboot, images, bootstrapEvent);
                        });
                      }else
                        bootstrapEvent.emit("bootstrap:done", fastbootboot);
                    })
                  }
              } else
                  bootstrapEvent.emit("bootstrap:done", fastbootboot)
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

var addPathToImages = (images, device) => {
  var ret = [];
  images.forEach((image) => {
      image["path"] = path.join(downloadPath, "images", device);
      ret.push(image);
  });
  return ret;
}

var setEvents = (downloadEvent) => {
  downloadEvent.on("download:done", () => {
    utils.log.info("Download complete");
    downloadEvent.emit("user:write:progress", 0);
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
    utils.log.debug("Download startCheck");
  });
  downloadEvent.on("download:start", (total) => {
    downloadEvent.nextTotal = total;
    downloadEvent.nextCurrent = 1;
    downloadEvent.nextBaseProgress = 0;
    utils.log.info("Starting download of "+total+" files");
    downloadEvent.emit("user:write:status", "Downloading Ubuntu Touch");
    downloadEvent.emit("user:write:next", "Downloading", 1, total);
  });
  downloadEvent.on("download:next", (current, total) => {
    downloadEvent.nextCurrent = current;
    downloadEvent.nextBaseProgress = Math.abs(Math.ceil((current-1)/total*100));
    utils.log.info(`Downloading file ${downloadEvent.nextCurrent}/${downloadEvent.nextTotal}`);
    downloadEvent.emit("user:write:next", "Downloading", downloadEvent.nextCurrent, downloadEvent.nextTotal);
    downloadEvent.emit("user:write:progress", downloadEvent.nextBaseProgress);
  });
  downloadEvent.on("download:progress", (percent) => {
    utils.log.debug(`Downloading file ${downloadEvent.nextCurrent} of ${downloadEvent.nextTotal}, ${Math.ceil(percent)}% complete`);
    downloadEvent.emit("user:write:progress", Math.ceil(percent/downloadEvent.nextTotal+downloadEvent.nextBaseProgress));
  });
  downloadEvent.on("adbpush:done", () => {
    utils.log.info("Done pushing files");
    utils.log.info("Rebooting to recovery to flash");
    downloadEvent.emit("system-image:done");
    downloadEvent.emit("user:write:status", "Rebooting to recovery to start the flashing process");
    downloadEvent.emit("user:write:progress", 0);
  });
  downloadEvent.on("adbpush:error", (e) => {
    downloadEvent.emit("error", "Adb push error: " + e)
    utils.log.error("Devices: Adb push error: "+ e)
  });
  downloadEvent.on("adbpush:progress", (percent) => {
    if (percent != NaN && percent != 100) {
      utils.log.debug(`Pushing file ${downloadEvent.nextCurrent} of ${downloadEvent.nextTotal}, ${Math.ceil(percent)}% complete`);
      downloadEvent.emit("user:write:progress", Math.ceil(percent/downloadEvent.nextTotal+downloadEvent.nextBaseProgress));
    }
  });
  downloadEvent.on("adbpush:next", (current, total) => {
    downloadEvent.nextCurrent = current;
    downloadEvent.nextBaseProgress = Math.abs(Math.ceil((current-1)/total*100));
    utils.log.info(`Pushing file ${downloadEvent.nextCurrent}/${downloadEvent.nextTotal}`);
    downloadEvent.emit("user:write:next", "Pushing", downloadEvent.nextCurrent, downloadEvent.nextTotal);
    downloadEvent.emit("user:write:progress", downloadEvent.nextBaseProgress);
  });
  downloadEvent.on("adbpush:start", (total) => {
    downloadEvent.nextTotal = total;
    downloadEvent.nextCurrent = 1;
    downloadEvent.nextBaseProgress = 0;
    utils.log.info("Start pushing " + total + " files");
    downloadEvent.emit("user:write:status", "Pushing files to device");
    downloadEvent.emit("user:write:start", "Pushing", total);
  });
}

var install = (options) => {
  // helper vars for progress events
  var nextCurrent;
  var nextTotal;
  var nextBaseProgress;
  if (!options)
    return false;
  const installEvent = new event();
  utils.log.debug("install event started with options: " + JSON.stringify(options))
  devicesApi.getInstallInstructs(options.device).then((instructs) => {
    setEvents(installEvent);
    installEvent.on("images:startDownload", () => {
      installEvent.emit("user:write:status", "Downloading images");
      utils.downloadFiles(addPathToImages(instructs.images, options.device), installEvent);
    });
    installEvent.on("system-image:start", () => {
      systemImage.installLatestVersion({
        device: options.device,
        channel: options.channel,
        event: installEvent,
        wipe: options.wipe
      });
    });
    installEvent.on("system-image:done", () => {
      instructReboot("recovery", instructs.buttons, installEvent, () => {
        installEvent.emit("user:write:done");
      });
    });
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
        });
      }
    });
    if (devicesApi.getInstallSetting(options.device, "bootstrap")) {
      // We need to be in bootloader
      instructReboot("bootloader", instructs.buttons, installEvent, () => {
        installEvent.once("download:done", () => {
          utils.log.debug("done downloading (once listener)");
          instructBootstrap(devicesApi.getInstallSetting(options.device, "fastbootboot"), addPathToImages(instructs.images, options.device), installEvent);
        });
        installEvent.emit("images:startDownload");
      });
    } else {
      // We need to be in recovery
      instructReboot("recovery", instructs.buttons, installEvent, () => {
        installEvent.emit("system-image:start");
      });
    }
  });
  return installEvent;
}

var getChannelSelects = (device, callback) => {
  if (!device) {
    callback (false);
    return;
  }
  var channelsAppend = [];
  systemImage.getDeviceChannels(device).then((channels) => {
    if (!global.installProperties.channel) {
      devicesApi.getInstallInstructs(device).then((ret) => {
        if (ret) {
          channels.forEach((channel) => {
            var _channel = channel.replace("ubports-touch/", "");
            // Ignore blacklisted channels
            if (ret["systemServer"]["blacklist"].indexOf(channel) == -1) {
              if (channel === ret["systemServer"]["selected"])
                channelsAppend.push("<option value="+channel+" selected>" + _channel + "</option>");
              else
                channelsAppend.push("<option value="+channel+">" + _channel + "</option>");
            }
          });
          callback(channelsAppend.join(''));
          return;
        } else {
          callback(false);
          return;
        }
      });
    } else {
      if (channels.indexOf(global.installProperties.channel) != -1) {
        setTimeout(callback([
          "<option value=" +
          global.installProperties.channel + " selected>" + global.installProperties.channel.replace("ubports-touch/", "") +
          "</option>"
        ]), 50);
        return;
      } else {
        callback(false);
        return;
      }
    }
  });
  // If the respose takes longer than half a second, get help
  setTimeout(() => {
    utils.log.debug("getChannelSelects timed out");
    callback(false);
    return;
  }, 500);
}

module.exports = {
  getDevice: devicesApi.getDevice,
  waitForDevice: (callback) => {
    var waitEvent;
    if (!global.installProperties.device) {
      waitEvent = adb.waitForDevice((deviceDetected) => {
        if (deviceDetected) {
          adb.getDeviceName((device) => {
            adb.isBaseUbuntuCom((ubuntuCom) => {
              waitEvent.emit("device:select:event", device, ubuntuCom, true);
              return;
            });
          });
        } else {
          waitEvent.emit("device:select:event", false);
          return;
        }
      });
    } else {
      waitEvent = new event();
    }
    waitEvent.on("device:select", (device) => {
      waitEvent.emit("stop");
      utils.log.info(device + " selected");
      waitEvent.emit("device:select:event", device, false, false);
    });
    waitEvent.once("device:select:event", (device, ubuntuCom, autoDetected) => {
      devicesApi.getDevice(device).then((apiData) => {
        if (apiData) {
          setTimeout(getChannelSelects(device, (channels) => {
            if (channels)
              callback(apiData, device, channels, ubuntuCom, autoDetected, isLegacyAndroid(device));
            ipcRenderer.send("setInstallProperties", { device: device });
            return;
          }), 50);
        } else {
          callback(false, device); // If there is no response, the device is not supported
          ipcRenderer.send("setInstallProperties", { device: device });
          return;
        }
      });
    });
    return waitEvent;
  },
  getNotWorking: getNotWorking,
  formatNotWorking: formatNotWorking,
  install: install,
  getDeviceSelects: (callback) => {
    devicesApi.getDevices().then((devices) => {
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
    });
  },
  instructOemUnlock: instructOemUnlock
}
