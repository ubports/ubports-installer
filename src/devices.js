"use strict";

/*
 * Copyright (C) 2017-2019 UBports Foundation <info@ubports.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const http = require("request");
const systemImage = require("./system-image");
const utils = require("./utils");
const os = require("os");
const path = require("path");

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

function addPathToImages(images, device, group) {
  var ret = [];
  images.forEach((image) => {
    image["partition"] = image.type;
    image["path"] = path.join(downloadPath, "images", device, group);
    image["file"] = path.join(downloadPath, "images", device, group, path.basename(image.url));
    ret.push(image);
  });
  return ret;
}

function sysimageinstall(instructs) {
  return new Promise(function(resolve, reject) {
    adb.waitForDevice(5000).then(() => {
      console.log("adb device detected")
      sic.downloadLatestVersion({device: "hammerhead", channel: "ubports-touch/16.04/edge", wipe: "false"}, downloadSpeed, downloadNext).then((files) => {
        console.log("Download done");
        adb.wipeCache().then(() => {
          adb.shell("mount -a").then(() => {
            adb.shell("mkdir -p /cache/recovery").then(() => {
              adb.pushArray(files, (progress) => {
                console.log("push progress: " + progress*100);
              }).then(() => {
                adb.reboot("recovery").then(() => {
                  console.log("reboot successfull");
                  resolve();
                }).catch(e => die("Reboot failed: " + e));
              }).catch(e => die("Push failed: Failed push: " + e));
            }).catch(e => die("Push failed: Failed to create target dir: " + e));
          }).catch(e => die("Push failed: Failed to mount: " + e));
        }).catch(e => die("Push failed: Failed to wipe cache: " + e));
      }).catch(e => die("System-Image Download failed: " + e));
    }).catch(e => die("Wait-for-device error: " + e));
  });
}

global.mainEvent.on("download:progress", (percent) => {
  global.mainEvent.emit("user:write:progress", percent*100);
});
global.mainEvent.on("download:speed", (speed) => {
  global.mainEvent.emit("user:write:speed", Math.round(speed*100)/100);
});

function install(steps) {
  var installPromises = []

  steps.forEach((step) => {
    switch (step.type) {
      case "download":
        installPromises.push(() => {
          // return utils.downloadFiles(addPathToImages(step.files, global.installProperties.device, step.group), ()=>{}, ()=>{});
          return new Promise(function(resolve, reject) {
            utils.log.debug("step: " + JSON.stringify(step));
            global.mainEvent.emit("user:write:working", "download");+
            global.mainEvent.emit("user:write:status", "Downloading " + step.group);
            global.mainEvent.emit("user:write:under", "Downloading");
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "adb:reboot":
        installPromises.push(() => {
          // return adb.reboot(step.to_state);
          return new Promise(function(resolve, reject) {
            global.mainEvent.emit("user:write:working", "particles");+
            global.mainEvent.emit("user:write:status", "Rebooting");
            global.mainEvent.emit("user:write:under", "Rebooting to " + step.to_state);
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "fastboot:flash":
        installPromises.push(() => {
          // return fastboot.flashArray(addPathToImages(step.flash, global.installProperties.device, step.group));
          return new Promise(function(resolve, reject) {
            global.mainEvent.emit("user:write:working", "particles");+
            global.mainEvent.emit("user:write:status", "Flashing firmware");
            global.mainEvent.emit("user:write:under", "Flashing firmware partitions using fastboot");
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "fastboot:erase":
        installPromises.push(() => {
          global.mainEvent.emit("user:write:working", "particles");+
          global.mainEvent.emit("user:write:status", "Ceaning up");
          global.mainEvent.emit("user:write:under", "Erasing " + step.partition + " partition");
          // return fastboot.erase(step.partition);
          return new Promise(function(resolve, reject) {
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "fastboot:boot":
        installPromises.push(() => {
          // return fastboot.boot(path.join("./", "test", step.group, step.file), step.partition);
          return new Promise(function(resolve, reject) {
            global.mainEvent.emit("user:write:working", "particles");
            global.mainEvent.emit("user:write:status", "Rebooting");
            global.mainEvent.emit("user:write:under", "Your device is being rebooted...");
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "systemimage":
        installPromises.push(() => {
          // return sysimageinstall();
          return new Promise(function(resolve, reject) {
            global.mainEvent.emit("user:write:working", "particles");
            global.mainEvent.emit("user:write:status", "System-Image");
            global.mainEvent.emit("user:write:under", "Going through system-image process");
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      case "fastboot:update":
        installPromises.push(() => {
          // return fastboot.update(path.join("./", "test", step.group, step.file));
          return new Promise(function(resolve, reject) {
            global.mainEvent.emit("user:write:working", "particles");
            global.mainEvent.emit("user:write:status", "Updating system");
            global.mainEvent.emit("user:write:under", "Applying fastboot update zip");
            utils.log.debug("step: " + JSON.stringify(step));
            setTimeout(() => {
              utils.log.debug(step.type + " done");
              resolve();
            }, 2000);
          });
        });
        break;
      default:
        throw "error: unrecognized step type: " + step.type
    }
  });
  installPromises.push(() => {
    global.mainEvent.emit("user:write:done");
    global.mainEvent.emit("user:write:status", global.installConfig.operating_systems[global.installProperties.osIndex].name + " successfully installed!", false);
    global.mainEvent.emit("user:write:under", global.installConfig.operating_systems[global.installProperties.osIndex].success_message || "All done! Enjoy exploring your new OS!");
  });

  // Actually run the steps
  installPromises.reduce(
    (promiseChain, currentFunction) => promiseChain.then(currentFunction),
    Promise.resolve()
  );
}

module.exports = {
  getDevice: undefined,
  waitForDevice: () => {
    adb.waitForDevice().then(() => {
      adb.getDeviceName().then((device) => {
        adb.getOs().then((operatingSystem) => {
          global.mainEvent.emit("device:detected", device, (operatingSystem=="ubuntutouch"), true);
          return;
        }).catch((error) => {
          utils.errorToUser(error, "Wait for device")
        });
      }).catch((error) => {
        utils.errorToUser(error, "get device name");
      });
    }).catch(e => utils.log.debug("no device detected: " + e));
    global.mainEvent.once("device:select", (device) => {
      adb.stopWaiting();
      utils.log.info(device.name + "(" + device.codename + ")" + " selected");
      global.mainEvent.emit("device:select:event", device, false, false);
    });
    global.mainEvent.once("device:select:event", (device, ubuntuCom, autoDetected) => {
      // FIXME: Implement settings, don't just install
      install(device.steps);
    });
  },
  getDeviceSelects: (callback) => {
    var devices = [
      {
        device: "hammerhead",
        name: "Nexus 5"
      }
    ]
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
  },
  getOsSelects: (osArray) => {
    var osSelects = [];
    for (var i = 0; i < osArray.length; i++) {
      osSelects.push("<option name=\"" + i + "\">" + osArray[i].name + "</option>");
    }
    return osSelects;
  }
}
