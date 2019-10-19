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

function addPathToImages(images, device, group) {
  var ret = [];
  images.forEach((image) => {
    image["partition"] = image.type;
    image["path"] = path.join(downloadPath, device, group);
    image["file"] = path.join(path.basename(image.url));
    ret.push(image);
  });
  return ret;
}

function addPathToFiles(files, device) {
  var ret = [];
  for (var i = 0; i < files.length; i++) {
    ret.push({file: path.join(downloadPath, device, files[i].group, files[i].file), partition: files[i].partition });
  }
  return ret;
}

function installStep(step) {
  if (step.condition && global.installProperties.settings[step.condition.var] != step.condition.value) {
    // If the condition is not met, no need to do anything
    return;
  }
  switch (step.type) {
    case "download":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "download");
          global.mainEvent.emit("user:write:status", "Downloading " + step.group);
          global.mainEvent.emit("user:write:under", "Downloading");
          utils.downloadFiles(addPathToImages(step.files, global.installProperties.device, step.group), (progress, speed) => {
            global.mainEvent.emit("user:write:progress", progress*100);
            global.mainEvent.emit("user:write:speed", Math.round(speed*100)/100);
          }, (current, total) => {
            utils.log.info("Downloaded file " + current + " of " + total);
          }).then(() => {
            utils.log.debug(step.type + " done");
            setTimeout(() => {
              global.mainEvent.emit("user:write:working", "particles");
              global.mainEvent.emit("user:write:under", "Verifying download");
              global.mainEvent.emit("user:write:progress", 0);
              global.mainEvent.emit("user:write:speed", 0);
              resolve();
            }, 1000);
          }).catch(reject);
        });
      };
      break;
    case "adb:reboot":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "particles");+
          global.mainEvent.emit("user:write:status", "Rebooting");
          global.mainEvent.emit("user:write:under", "Rebooting to " + step.to_state);
          adb.reboot(step.to_state).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch((error) => {
            utils.log.error("reboot failed: " + error);
            global.mainEvent.emit("user:action", global.installConfig.user_actions[step.to_state], () => {
              utils.log.debug(step.type + " done");
              resolve();
            });
          });
        });
      };
      break;
    case "fastboot:flash":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "particles");
          global.mainEvent.emit("user:write:status", "Flashing firmware");
          global.mainEvent.emit("user:write:under", "Flashing firmware partitions using fastboot");
          utils.log.debug(JSON.stringify(addPathToFiles(step.flash, global.installProperties.device)))
          fastboot.flashArray(addPathToFiles(step.flash, global.installProperties.device)).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch(e => errorToUser(e, "fastboot flash"));
        });
      };
      break;
    case "fastboot:erase":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "particles");+
          global.mainEvent.emit("user:write:status", "Ceaning up");
          global.mainEvent.emit("user:write:under", "Erasing " + step.partition + " partition");
          fastboot.erase(step.partition).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch(e => errorToUser(e, "fastboot erase"));
        });
      };
      break;
    case "fastboot:boot":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "particles");
          global.mainEvent.emit("user:write:status", "Rebooting");
          global.mainEvent.emit("user:write:under", "Your device is being rebooted...");
          fastboot.boot(path.join(downloadPath, global.installProperties.device, step.group, step.file), step.partition).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch((e) => {
            if (step.fallback_user_action) {
              global.mainEvent.emit("user:action", global.installConfig.user_actions[step.fallback_user_action], () => {
                utils.log.debug(step.type + " done");
                resolve();
              });
            } else {
              errorToUser(e, "fastboot boot");
            }
          });
        });
      };
      break;
    case "systemimage":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          systemImage.installLatestVersion(Object.assign({device: global.installConfig.codename}, global.installProperties.settings)).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch(e => errorToUser(e, "systemimage"));
        });
      };
      break;
    case "fastboot:update":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:write:working", "particles");
          global.mainEvent.emit("user:write:status", "Updating system");
          global.mainEvent.emit("user:write:under", "Applying fastboot update zip");
          fastboot.update(path.join(downloadPath, global.installProperties.device, step.group, step.file)).then(() => {
            utils.log.debug(step.type + " done");
            resolve();
          }).catch(e => errorToUser(e, "fastboot update"));
        });
      };
      break;
    case "user_action":
      return () => {
        return new Promise(function(resolve, reject) {
          utils.log.debug("step: " + JSON.stringify(step));
          global.mainEvent.emit("user:action", global.installConfig.user_actions[step.action], () => {
            utils.log.debug(step.type + " done");
            resolve();
          });
        });
      };
      break;
    default:
      throw "error: unrecognized step type: " + step.type
  }
}

function install(steps) {
  var installPromises = [];
  steps.forEach((step) => {
    installPromises.push(installStep(step));
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
  waitForDevice: () => {
    adb.waitForDevice().then(() => {
      adb.getDeviceName().then((device) => {
        adb.getOs().then((operatingSystem) => {
          global.api.resolveAlias(device).then((resolvedDevice) => {
            global.mainEvent.emit("device:detected", resolvedDevice, (operatingSystem=="ubuntutouch"), true);
          }).catch((error) => { utils.errorToUser(error, "Resolve device alias"); });
        }).catch((error) => { utils.errorToUser(error, "Wait for device"); });
      }).catch((error) => { utils.errorToUser(error, "get device name"); });
    }).catch(e => utils.log.debug("no device detected: " + e));
  },
  getOsSelects: (osArray) => { // TODO move to api module
    var osSelects = [];
    for (var i = 0; i < osArray.length; i++) {
      osSelects.push("<option name=\"" + i + "\">" + osArray[i].name + "</option>");
    }
    return osSelects;
  },
  install: install
}
