"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const http = require("request");
const ubportsApi = require("ubports-api-node-module");
const systemImage = require("./system-image");
const utils = require("./utils");
const os = require("os");
const path = require("path");

const devicesApi = new ubportsApi.Devices();
const downloadPath = utils.getUbuntuTouchDir();

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

var instructReboot = (state, button, callback) => {
  global.mainEvent.emit("user:write:working", "particles");
  global.mainEvent.emit("user:write:status", "Rebooting to " + state);
  global.mainEvent.emit("user:write:under", "Waiting for device to enter " + state + " mode");
  var manualReboot = () => {
    utils.log.info("Instructing manual reboot");
    utils.log.info(button[state]["instruction"]);
    global.mainEvent.emit("user:reboot", {
      button: button[state]["button"],
      instruction: button[state]["instruction"],
      state: state
    });
  }
  var rebootTimeout = setTimeout(() => { manualReboot(); }, 15000);
  adb.hasAccess().then((hasAccess) => {
    if (hasAccess) {
      adb.reboot(state).then(() => {
        clearTimeout(rebootTimeout);
        global.mainEvent.emit("reboot:done");
      }).catch((err) => {
        utils.log.warn("Adb failed to reboot!, " + err);
        clearTimeout(rebootTimeout);
        manualReboot();
      });
    } else {
      clearTimeout(rebootTimeout);
      manualReboot();
    }
    if (state === "bootloader") {
      fastboot.waitForDevice().then((err, errM) => {
        if (err) {
          utils.errorToUser(errM, "fastboot.waitForDevice");
          return;
        } else {
          clearTimeout(rebootTimeout);
          global.mainEvent.emit("reboot:done");
          callback();
          return;
        }
      });
    } else {
      adb.waitForDevice().then(() => {
        clearTimeout(rebootTimeout);
        global.mainEvent.emit("reboot:done");
        callback();
        return;
      });
    }
  }).catch((error) => {
    utils.errorToUser(error, "Wait for device")
  });
}

var downloadImages = (images, device) => {
  utils.log.debug(addPathToImages(images, device));
  global.mainEvent.emit("user:write:working", "download");
  global.mainEvent.emit("user:write:status", "Downloading Firmware");
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

function addPathToImages(images, device) {
  var ret = [];
  images.forEach((image) => {
    image["partition"] = image.type;
    image["path"] = path.join(downloadPath, "images", device);
    image["file"] = path.join(downloadPath, "images", device, image.type + "-" + device + ".img");
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

var install = (options) => {
  if (!options)
    return false;
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
      if (!bootstrap) {
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
        adb.waitForDevice().then(() => {
          systemImage.installLatestVersion({
            device: options.device,
            channel: options.channel,
            wipe: options.wipe
          });
        }).catch((error) => { utils.errorToUser(error, "Wait for device"); });
      }
    });
    if (instructs.images.length > 0) { // If images are specified, flash them (bootstrapping)
      // We need to be in bootloader
      global.mainEvent.emit("user:write:status", "Waiting for device to enter bootloader mode");
      global.mainEvent.emit("user:write:under", "Fastboot is scanning for devices");
      instructReboot("bootloader", instructs.buttons, () => {
        global.mainEvent.once("download:done", () => {
          global.mainEvent.emit("user:write:working", "particles");
          global.mainEvent.emit("user:write:status", "Flashing images");
          global.mainEvent.emit("user:write:under", "Flashing recovery and boot images");
          global.mainEvent.emit("user:write:progress", 0);
          fastboot.erase("cache").then(() => {
            fastboot.flashArray(addPathToImages(instructs.images, options.device)).then(() => {
              if (instructs.bootstrap) { // Device should support the fastboot boot command
                var recoveryImg;
                instructs.images.forEach((image) => {
                  if (image.type == "recovery") recoveryImg = image.file;
                });
                fastboot.boot(recoveryImg).then(() => {
                  global.mainEvent.emit("bootstrap:done", true);
                }).catch(() => {
                  global.mainEvent.emit("bootstrap:done", false);
                });
              } else {
                global.mainEvent.emit("bootstrap:done", false);
              }
            }).catch((error) => { utils.errorToUser(error, "bootstrap"); });
          }).catch(((e) => { utils.errorToUser(e, "Fastboot: Erase cache"); }));
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

module.exports = {
  getDevice: devicesApi.getDevice,
  waitForDevice: () => {
    adb.waitForDevice().then(() => {
      adb.getDeviceName().then((device) => {
        adb.getOs().then((operatingSystem) => {
          global.mainEvent.emit("device:select:event", device, (operatingSystem=="ubuntutouch"), true);
          return;
        }).catch((error) => {
          utils.errorToUser(error, "Wait for device")
        });
      }).catch((error) => {
        utils.errorToUser(error, "get device name");
      });
    }).catch(e => utils.log.debug("no device detected: " + e));
    global.mainEvent.once("device:select", (device) => {
      global.mainEvent.emit("stop");
      utils.log.info(device + " selected");
      global.mainEvent.emit("device:select:event", device, false, false);
    });
    global.mainEvent.once("device:select:event", (device, ubuntuCom, autoDetected) => {
      devicesApi.getDevice(device).then((apiData) => {
          if (apiData) {
            systemImage.getDeviceChannels(device).then((channels) => {
              var channelsAppend = [];
              devicesApi.getInstallInstructs(device).then((ret) => {
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
                global.mainEvent.emit("device:select:data-ready", apiData, device, channelsAppend.join(''), ubuntuCom, autoDetected);
              }).catch(((e) => { utils.log.error(e); global.mainEvent.emit("user:no-network"); }));
            }).catch((e) => { utils.log.error(e); global.mainEvent.emit("user:no-network"); });
          } else {
            mainEvent.emit("user:device-unsupported", device); // If there is no response, the device is not supported
            // ipcRenderer.send("setInstallProperties", { device: device });
            return;
          }
        }).catch(((e) => { utils.errorToUser(e, "Device Select"); }));
    });
  },
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
  }
}
