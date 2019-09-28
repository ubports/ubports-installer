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
  global.mainEvent.emit("user:write:working", "particles");
  global.mainEvent.emit("user:write:status", "Rebooting to " + state);
  global.mainEvent.emit("user:write:under", "Waiting for device to enter " + state + " mode");
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
            utils.errorToUser(errM, "fastboot.waitForDevice");
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
        utils.errorToUser(err.message, "Password");
      }
    });
  });
}

var instructOemUnlock = (callback) => {
  requestPassword((p) => {
    fastboot.oemUnlock(password, (err, errM) => {
      if (err) {
        utils.errorToUser(errM, "OEM unlock");
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
    utils.errorToUser(errM, "Bootstrap");
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
            utils.errorToUser("Cant find recoveryImg to boot: "+images, "fastboot.boot");
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
  global.mainEvent.emit("user:write:working", "particles");
  global.mainEvent.emit("user:write:status", "Flashing images");
  global.mainEvent.emit("user:write:under", "Flashing recovery and boot images");
  global.mainEvent.emit("user:write:progress", 0);
  if (!utils.needRoot()) {
    flash(false);
  } else {
    requestPassword((p) => {
      flash(p);
    });
  }
}

var downloadImages = (images, device) => {
  utils.log.debug(addPathToImages(images, device));
  global.mainEvent.emit("user:write:working", "download");
  global.mainEvent.emit("user:write:status", "Downloading Ubuntu Touch");
  global.mainEvent.emit("user:write:under", "Downloading");
  utils.downloadFiles(images, (progress, speed) => {
    global.mainEvent.emit("download:progress", progress);
    global.mainEvent.emit("download:speed", speed);
  }, (current, total) => {
    if (current != total) utils.log.debug("Downloading bootstrap image " + (current+1) + " of " + total);
  }).then((files) => {
    utils.log.debug(files)
    // Wait for one second until the progress event stops firing
    setTimeout(() => {
      global.mainEvent.emit("download:done");
    }, 1000);
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

global.mainEvent.on("download:progress", (percent) => {
  global.mainEvent.emit("user:write:progress", percent*100);
});
global.mainEvent.on("download:speed", (speed) => {
  global.mainEvent.emit("user:write:speed", Math.round(speed*100)/100);
});
global.mainEvent.on("adbpush:progress", (percent) => {
  global.mainEvent.emit("user:write:progress", percent*100);
});

var install = (options) => {
  if (!options)
    return false;
  utils.log.debug("install event started with options: " + JSON.stringify(options))
  devicesApi.getInstallInstructs(options.device).then((instructs) => {
    global.mainEvent.once("adbpush:done", () => {
      utils.log.info("Done pushing files");
      utils.log.info("Rebooting to recovery to flash");
      global.mainEvent.emit("user:write:progress", 0);
      global.mainEvent.emit("user:write:working", "particles");
      instructReboot("recovery", instructs.buttons, () => {
        global.mainEvent.emit("user:write:done");
      });
    });
    global.mainEvent.once("bootstrap:done", (bootstrap) => {
      utils.log.info("bootstrap done: " + (bootstrap ? "rebooting automatically" : "rebooting manually"));
      if (!bootstrap){
        instructReboot("recovery", instructs.buttons, () => {
          systemImage.installLatestVersion({
            device: options.device,
            channel: options.channel,
            wipe: options.wipe
          });
        });
      } else {
        global.mainEvent.emit("user:write:status", "Rebooting to recovery");
        global.mainEvent.emit("user:write:under", "Waiting for device to enter recovery mode");
        adb.waitForDevice(() => {
          systemImage.installLatestVersion({
            device: options.device,
            channel: options.channel,
            wipe: options.wipe
          });
        });
      }
    });
    if (instructs.images.length > 0) { // If images are specified, flash them (bootstrapping)
      // We need to be in bootloader
      global.mainEvent.emit("user:write:status", "Waiting for device to enter bootloader mode");
      global.mainEvent.emit("user:write:under", "Fastboot is scanning for devices");
      instructReboot("bootloader", instructs.buttons, () => {
        global.mainEvent.once("download:done", () => {
          instructBootstrap(instructs.installSettings.bootstrap, addPathToImages(instructs.images, options.device));
        });
        downloadImages(instructs.images, options.device);
      });
    } else { // If no images are specified, go straight to system-image
      // We need to be in recovery
      instructReboot("recovery", instructs.buttons, () => {
        systemImage.installLatestVersion({
          device: options.device,
          channel: options.channel,
          wipe: options.wipe
        });
      });
    }
  }).catch((e) => { utils.errorToUser(e, "Install"); });
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
    }).catch(((e) => { utils.errorToUser(e, "Devices API"); }));
  }).catch((e) => { utils.errorToUser(e, "SystemImage API"); });
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
        }).catch(((e) => { utils.errorToUser(e, "Device Select"); }));
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
    }).catch(((e) => { utils.errorToUser(e, "getDeviceSelects"); }));
  },
  instructOemUnlock: instructOemUnlock
}
