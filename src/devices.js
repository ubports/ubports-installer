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
      utils.log.info("This is a legacy android device");
      return true;
    default:
      utils.log.debug("This is NOT a legacy android device");
      return false;
  }
}

var getNotWorking = (ww) => {
  if (!ww) return false;
  var notWorking = [];
  var whatsWorking = JSON.parse(ww);
  for (var i in whatsWorking) {
    if (whatsWorking[i] == 1) notWorking.push(i);
  }
  if (whatsWorking.length == 0) return false;
  else return notWorking;
}

var formatNotWorking = (nw) => {
  if (!nw) return false;
  return nw.join(", ").replace("/\,(?=[^,]*$)", " and");
}

var instructReboot = (state, button, callback) => {
  var rebooted = false;
  var manualReboot = () => {
    utils.log.info("Instructing manual reboot");
    utils.log.info(button[state]["instruction"]);
    global.mainEvent.emit("user:reboot", {
      button: button[state]["button"],
      instruction: button[state]["instruction"],
      state: state
    });
  }
  adb.hasAdbAccess((hasAccess) => {
    if (hasAccess) {
      adb.reboot(state, (err, out, eout) => {
        if (err) {
          utils.log.warn("Adb failed to reboot!, " + out + " : " + eout);
          manualReboot();
        } else {
          global.mainEvent.emit("adb:rebooted");
        }
      });
    } else {
      manualReboot();
    }
    if (state === "bootloader") {
      requestPassword((pass) => {
        fastboot.waitForDevice(pass, (err, errM) => {
          if (err) {
            global.mainEvent.emit("Error", errM);
            return;
          } else {
            rebooted = true;
            global.mainEvent.emit("reboot:done");
            global.mainEvent.emit("state:bootloader");
            callback();
            return;
          }
        });
      });
    } else {
      adb.waitForDevice(() => {
        rebooted = true;
        // We expect the device state to mach installState now
        global.mainEvent.emit("reboot:done");
        global.mainEvent.emit("state:" + state);
        callback();
        return;
      });
    }
  });
  setTimeout(() => { if (!rebooted) manualReboot() }, 15000);
}

var requestPassword = (callback) => {
  if (!utils.needRoot()) {
    callback("");
    return;
  }
  if (password) {
    callback(password);
    return;
  }
  global.mainEvent.emit("user:password");
  global.mainEvent.once("password", (p) => {
    utils.checkPassword(p, (correct, err) => {
      if (correct) {
        password=p;
        callback(p);
      } else if (err.password) {
        global.mainEvent.emit("user:password:wrong");
        requestPassword(callback);
      } else {
        global.mainEvent.emit("error", err.message)
      }
    });
  });
}

var instructOemUnlock = (callback) => {
  requestPassword((p) => {
    fastboot.oemUnlock(password, (err, errM) => {
      if (err) {
        global.mainEvent.emit("error", errM);
        callback(true);
      } else {
        callback(false);
      }
    });
  })
}

var handleBootstrapError = (err, errM, backToFunction) => {
  if (err.bootFailed) {
    utils.log.warn("fastboot boot failed, does the " + global.installProperties.device + " really support it?");
    global.mainEvent.emit("bootstrap:done", false); // This will instruct a manual reboot
  } else if (err.password) {
    ipcRenderer.send("user:password:wrong", backToFunction);
  } else if (err.connectionLost) {
    utils.log.warn("connection to device lost");
    global.mainEvent.emit("user:connection-lost", backToFunction);
  } else if (err.locked) {
    global.mainEvent.emit("user:oem-lock", backToFunction);
  } else if (err.lowPower) {
    global.mainEvent.emit("user:low-power");
  } else {
    global.mainEvent.emit("error", errM);
  }
}

var instructBootstrap = (bootstrap, images) => {
  //TODO check bootloader name/version/device
  var flash = (p) => {
    utils.log.info("Flashing images...")
    fastboot.flash(images, (err, errM) => {
      if (err) {
        handleBootstrapError(err, errM, () => {
          instructBootstrap(bootstrap, images);
        });
      } else {
        if (bootstrap) { // The device supports the "fastboot boot" command
          utils.log.info("Booting into recovery image...");
          // find recovery image
          var recoveryImg;
          images.forEach((image) => {
            if (image.type === "recovery")
              recoveryImg = image;
          });
          // If we can't find it, report error!
          if (!recoveryImg) {
            global.mainEvent.emit("error", "Cant find recoveryImg to boot: "+images);
          } else {
            fastboot.boot(recoveryImg, p, (err, errM) => {
              if (err) {
                handleBootstrapError(err, errM, () => {
                  instructBootstrap(bootstrap, images);
                });
              } else {
                global.mainEvent.emit("bootstrap:done", bootstrap);
              }
            });
          }
        } else { // The device needs to be rebooted manually
          global.mainEvent.emit("bootstrap:done", false);
        }
      }
    }, p);
  }
  global.mainEvent.emit("bootstrap:flashing")
  global.mainEvent.emit("user:write:status", "Flashing images")
  if (!utils.needRoot()) {
    flash(false);
  } else {
    requestPassword((p) => {
      flash(p);
    });
  }
}

var downloadImages = (images, device) => {
  utils.log.debug(addPathToImages(images, device))
  global.mainEvent.once("download:progress", () => {
    global.mainEvent.emit("download:start");
  })
  utils.downloadFiles(images, (progress, speed) => {
    global.mainEvent.emit("download:progress", progress);
    global.mainEvent.emit("download:speed", speed);
  }, (current, total) => {
    if (current != total) utils.log.debug("Downloading bootstrap image " + (current+1) + " of " + total);
  }).then((files) => {
    utils.log.debug(files)
    global.mainEvent.emit("download:done");
  });
}

var addPathToImages = (images, device) => {
  var ret = [];
  images.forEach((image) => {
    image["path"] = path.join(downloadPath, "images", device);
    ret.push(image);
  });
  return ret;
}

global.mainEvent.on("download:done", () => {
  utils.log.info("Download complete");
  global.mainEvent.emit("user:write:progress", 0);
});
global.mainEvent.on("download:error", (r) => {
  utils.log.error("Devices: Download error "+r);
});
global.mainEvent.on("error", (r) => {
  global.mainEvent.emit("user:error", r);
  utils.log.error("Devices: Error: "+r);
});
global.mainEvent.on("download:checking", () => {
  utils.log.info("Download checking file");
});
global.mainEvent.on("download:startCheck", () => {
  global.mainEvent.emit("user:write:status", "Checking Ubuntu Touch files");
  utils.log.debug("Download startCheck");
});
global.mainEvent.on("download:start", (total) => {
  global.mainEvent.emit("user:write:status", "Downloading Ubuntu Touch");
  global.mainEvent.emit("user:write:under", "Downloading");
});
global.mainEvent.on("download:progress", (percent) => {
  // utils.log.debug(`Downloading files: ${percent*100}% complete`);
  global.mainEvent.emit("user:write:progress", percent*100);
});
global.mainEvent.on("download:speed", (speed) => {
  // utils.log.debug(`Downloading at ${speed}% MB/s`);
  global.mainEvent.emit("user:write:speed", Math.round(speed*100)/100);
});
global.mainEvent.on("adbpush:error", (e) => {
  global.mainEvent.emit("error", "Adb push error: " + e)
  utils.log.error("Devices: Adb push error: "+ e)
});
global.mainEvent.on("adbpush:progress", (percent) => {
  utils.log.debug(`Pushing ${Math.ceil(percent*100)}% complete`);
  global.mainEvent.emit("user:write:progress", percent*100);
});
global.mainEvent.on("adbpush:start", (total) => {
  global.mainEvent.nextTotal = total;
  global.mainEvent.nextCurrent = 1;
  global.mainEvent.nextBaseProgress = 0;
  utils.log.info("Start pushing " + total + " files");
  global.mainEvent.emit("user:write:status", "Pushing files to device");
  global.mainEvent.emit("user:write:start", "Pushing", total);
});

var install = (options) => {
  // helper vars for progress events
  var nextCurrent;
  var nextTotal;
  var nextBaseProgress;
  if (!options)
    return false;
  utils.log.debug("install event started with options: " + JSON.stringify(options))
  devicesApi.getInstallInstructs(options.device).then((instructs) => {
    global.mainEvent.once("adbpush:done", () => {
      utils.log.info("Done pushing files");
      utils.log.info("Rebooting to recovery to flash");
      global.mainEvent.emit("system-image:done");
      global.mainEvent.emit("user:write:status", "Rebooting to recovery to start the flashing process");
      global.mainEvent.emit("user:write:status", "All files pushed successfully!");
      global.mainEvent.emit("user:write:progress", 0);
    });
    global.mainEvent.once("system-image:start", () => {
      systemImage.installLatestVersion({
        device: options.device,
        channel: options.channel,
        wipe: options.wipe
      });
    });
    global.mainEvent.once("system-image:done", () => {
      instructReboot("recovery", instructs.buttons, () => {
        global.mainEvent.emit("user:write:done");
      });
    });
    global.mainEvent.once("bootstrap:done", (bootstrap) => {
      utils.log.info("bootstrap done: " + (bootstrap ? "rebooting automatically" : "rebooting manually"));
      if (!bootstrap){
        instructReboot("recovery", instructs.buttons, () => {
          global.mainEvent.emit("system-image:start");
        });
      } else {
        global.mainEvent.emit("user:write:status", "Waiting for device to enter recovery mode", true);
        global.mainEvent.emit("user:write:under", "Rebooting...");
        adb.waitForDevice(() => {
          global.mainEvent.emit("system-image:start");
        });
      }
    });
    if (instructs.images.length > 0) { // If images are specified, flash them (bootstrapping)
      // We need to be in bootloader
      global.mainEvent.emit("user:write:under", "Please connect your device with a USB cable");
      instructReboot("bootloader", instructs.buttons, () => {
        global.mainEvent.once("download:done", () => {
          instructBootstrap(instructs.installSettings.bootstrap, addPathToImages(instructs.images, options.device));
        });
        global.mainEvent.emit("user:write:status", "Downloading images");
        downloadImages(instructs.images, options.device);
      });
    } else { // If no images are specified, go straight to system-image
      // We need to be in recovery
      instructReboot("recovery", instructs.buttons, () => {
        global.mainEvent.emit("system-image:start");
      });
    }
  }).catch(utils.log.error);
}

var getChannelSelects = (device, callback) => {
  if (!device) {
    callback (false);
    return;
  }
  var channelsAppend = [];
  systemImage.getDeviceChannels(device).then((channels) => {
    devicesApi.getInstallInstructs(device).then((ret) => {
      if (ret) {
        channels.forEach((channel) => {
          var _channel = channel.replace("ubports-touch/", "");
          // Ignore blacklisted channels
          if (ret["systemServer"]["blacklist"].indexOf(channel) == -1 &&
              channel.indexOf("15.04") == -1) {
            if (channel === ret["systemServer"]["selected"])
              channelsAppend.push("<option value="+channel+" selected>" + _channel + "</option>");
            else
              channelsAppend.push("<option value="+channel+">" + _channel + "</option>");
          }
        });
        channelsAppend.push("<option value=ubports-touch/16.04/edge>16.04/edge</option>")
        callback(channelsAppend.join(''));
        return;
      } else {
        callback(false);
        return;
      }
    }).catch(utils.log.error);
  }).catch(utils.log.error);
}

module.exports = {
  getDevice: devicesApi.getDevice,
  waitForDevice: () => {
    adb.waitForDevice((deviceDetected) => {
      if (deviceDetected) {
        adb.getDeviceName((device) => {
          adb.isBaseUbuntuCom((ubuntuCom) => {
            global.mainEvent.emit("device:select:event", device, ubuntuCom, true);
            return;
          });
        });
      } else {
        global.mainEvent.emit("device:select:event", false);
        return;
      }
    });
    global.mainEvent.once("device:select", (device) => {
      global.mainEvent.emit("stop");
      utils.log.info(device + " selected");
      global.mainEvent.emit("device:select:event", device, false, false);
    });
    global.mainEvent.once("device:select:event", (device, ubuntuCom, autoDetected) => {
      devicesApi.getDevice(device).then((apiData) => {
          if (apiData) {
            setTimeout(() => {
              getChannelSelects(device, (channels) => {
                if (channels) {
                  global.mainEvent.emit("device:select:data-ready", apiData, device, channels, ubuntuCom, autoDetected, isLegacyAndroid(device));
                } else {
                  global.mainEvent.emit("user:no-network");
                }
                return;
              });
            }, 50);
          } else {
            mainEvent.emit("user:device-unsupported", device); // If there is no response, the device is not supported
            // ipcRenderer.send("setInstallProperties", { device: device });
            return;
          }
        }).catch(utils.log.error);
    });
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
    }).catch(utils.log.error);
  },
  instructOemUnlock: instructOemUnlock
}
