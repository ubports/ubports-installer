"use strict";

/*
 * Copyright (C) 2017-2020 UBports Foundation <info@ubports.com>
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

const systemImage = require("./lib/system-image.js");
const path = require("path");
const { path: cachePath } = require("./lib/cache.js");
const log = require("./lib/log.js");
const errors = require("./lib/errors.js");
const deviceTools = require("./lib/deviceTools.js");
const { adb, fastboot, heimdall } = deviceTools;
const mainEvent = require("./lib/mainEvent.js");

/**
 * Transform path array
 * @param {Array} files files
 * @param {String} device codename
 */
function addPathToFiles(files, device) {
  return files.map(file => ({
    ...file,
    file: path.join(cachePath, device, file.group, file.file)
  }));
}

/**
 * turn a step into a promise
 * @param {Object} step installation step
 */
function installStep(step) {
  switch (step.type) {
    case "adb:format":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit(
          "user:write:status",
          "Preparing system for installation",
          true
        );
        mainEvent.emit("user:write:under", "Formatting " + step.partition);
        return adb.wait().then(() => adb.format(step.partition));
      };
    case "adb:sideload":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", `Sideloading ${step.group}`, true);
        mainEvent.emit(
          "user:write:under",
          "Your new operating system is being installed..."
        );
        return adb
          .sideload(
            path.join(
              cachePath,
              global.installProperties.device,
              step.group,
              step.file
            ),
            p => mainEvent.emit("user:write:progress", p * 100)
          )
          .then(() => mainEvent.emit("user:write:progress", 0));
      };
    case "adb:reboot":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting");
        mainEvent.emit("user:write:under", "Rebooting to " + step.to_state);
        return adb.reboot(step.to_state);
      };
    case "fastboot:flash":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Flashing firmware", true);
        mainEvent.emit(
          "user:write:under",
          "Flashing firmware partitions using fastboot"
        );
        return fastboot
          .wait()
          .then(() =>
            fastboot.flash(
              addPathToFiles(step.flash, global.installProperties.device),
              p => mainEvent.emit("user:write:progress", p * 100)
            )
          )
          .then(() => mainEvent.emit("user:write:progress", 0));
      };
    case "fastboot:erase":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Cleaning up", true);
        mainEvent.emit(
          "user:write:under",
          "Erasing " + step.partition + " partition"
        );
        return fastboot.erase(step.partition);
      };
    case "fastboot:format":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Cleaning up", true);
        mainEvent.emit(
          "user:write:under",
          "Formatting " + step.partition + " partition"
        );
        return fastboot.format(step.partition, step.partitionType, step.size);
      };
    case "fastboot:boot":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting");
        mainEvent.emit("user:write:under", "Your device is being rebooted...");
        return fastboot.boot(
          path.join(
            cachePath,
            global.installProperties.device,
            step.group,
            step.file
          ),
          step.partition
        );
      };
    case "systemimage":
      return () => {
        mainEvent.emit("user:write:progress", 0);
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Downloading Ubuntu Touch", true);
        mainEvent.emit("user:write:under", "Checking local files");
        return systemImage.installLatestVersion(
          Object.assign(
            { device: global.installConfig.codename },
            global.installProperties.settings
          )
        );
      };
    case "fastboot:update":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Updating system", true);
        mainEvent.emit(
          "user:write:under",
          "Applying fastboot update zip. This may take a while..."
        );
        return fastboot.update(
          path.join(
            cachePath,
            global.installProperties.device,
            step.group,
            step.file
          ),
          global.installProperties.settings.wipe
        );
      };
    case "fastboot:reboot_bootloader":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting", true);
        mainEvent.emit("user:write:under", "Rebooting to bootloader");
        return fastboot.rebootBootloader();
      };
    case "fastboot:reboot":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Rebooting", true);
        mainEvent.emit("user:write:under", "Rebooting system");
        return fastboot.reboot();
      };
    case "fastboot:continue":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Continuing boot", true);
        mainEvent.emit("user:write:under", "Resuming boot");
        return fastboot.continue();
      };
    case "fastboot:set_active":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Continuing boot", true);
        mainEvent.emit("user:write:under", "Resuming boot");
        return fastboot.setActive(step.slot);
      };
    case "heimdall:flash":
      return () => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Flashing firmware", true);
        mainEvent.emit(
          "user:write:under",
          "Flashing firmware partitions using heimdall"
        );
        return heimdall.flash(
          addPathToFiles(step.flash, global.installProperties.device)
        );
      };
    default:
      throw new Error("unrecognized step type: " + step.type);
  }
}

/**
 * Turn steps into a promise chain
 * @param {Array<Object>} steps installation steps
 * @param {Array<Function>}
 */
function assembleInstallSteps(steps) {
  let installPromises = steps.map(step => () =>
    new Promise(function(resolve, reject) {
      if (
        step.condition &&
        global.installProperties.settings[step.condition.var] !=
          step.condition.value
      ) {
        // If the condition is not met, no need to do anything
        log.debug("skipping step: " + JSON.stringify(step));
        resolve();
      } else {
        log.debug("running step: " + JSON.stringify(step));
        const fullRestart = () => install(steps);
        const smartRestart = step.resumable ? runStep : fullRestart; // FIXME resumable never implemented
        let reconnections = 0;
        function runStep() {
          installStep(step)()
            .then(() => {
              resolve();
              log.debug(step.type + " done");
            })
            .catch(error => {
              if (step.optional) {
                resolve();
              } else if (step.fallback_user_action) {
                installStep({
                  type: "user_action",
                  action: step.fallback_user_action
                })()
                  .then(resolve)
                  .catch(reject);
              } else if (error.message.includes("low battery")) {
                mainEvent.emit("user:low-power");
              } else if (
                error.message.includes("bootloader locked") ||
                error.message.includes("enable unlocking")
              ) {
                function unlock() {
                  fastboot
                    .oemUnlock()
                    .then(() => runStep())
                    .catch(err => {
                      if (err.message.includes("enable unlocking")) {
                        mainEvent.emit("user:oem-lock", true, unlock);
                      } else {
                        mainEvent.emit("user:error", err);
                      }
                    });
                }
                mainEvent.emit("user:oem-lock", false, unlock);
              } else if (error.message.includes("no device")) {
                mainEvent.emit("user:connection-lost", smartRestart);
              } else if (
                error.message.includes("device offline") ||
                error.message.includes("unauthorized")
              ) {
                if (reconnections < 3) {
                  adb
                    .reconnect()
                    .then(() => {
                      log.warn(`automatic reconnection ${++reconnections}`);
                      runStep();
                    })
                    .catch(error => {
                      log.warn(`failed to reconnect automatically: ${error}`);
                      mainEvent.emit("user:connection-lost", smartRestart);
                    });
                } else {
                  log.warn("maximum automatic reconnection attempts exceeded");
                  mainEvent.emit("user:connection-lost", smartRestart);
                }
              } else if (error.message.includes("killed")) {
                reject(); // Used for exiting the installer
              } else {
                errors.toUser(error, step.type, fullRestart, runStep);
              }
            });
        }
        runStep();
      }
    })
  );

  installPromises.push(() => {
    mainEvent.emit("user:write:done");
    mainEvent.emit(
      "user:write:status",
      global.installConfig.operating_systems[global.installProperties.osIndex]
        .name + " successfully installed!",
      false
    );
    mainEvent.emit(
      "user:write:under",
      global.installConfig.operating_systems[global.installProperties.osIndex]
        .success_message || "All done! Enjoy exploring your new OS!"
    );
  });

  return installPromises;
}

/**
 * run a chain of installation steps
 * @param {Array} steps installation steps
 */
function install(steps) {
  assembleInstallSteps(steps)
    .reduce((chain, next) => chain.then(next), Promise.resolve())
    .catch(() => {}); // errors can be ignored here, since this is exclusively used for killing the promise chain
}

/**
 * configure remote values
 * @param {any} osInstructs instructions
 * @returns {Promise}
 */
function setRemoteValues(osInstructs) {
  return Promise.all(
    osInstructs.options.map(option => {
      return new Promise(function(resolve, reject) {
        if (!option.remote_values) {
          resolve(option); // no remote values, nothing to do
        } else {
          switch (option.remote_values.type) {
            case "systemimagechannels":
              systemImage
                .getDeviceChannels(global.installConfig.codename)
                .then(channels => {
                  option.values = channels
                    .map(channel => {
                      return {
                        value: channel,
                        label: channel.replace("ubports-touch/", "")
                      };
                    })
                    .reverse();
                  resolve(option);
                })
                .catch(e =>
                  reject(
                    new Error("fetching system image channels failed: " + e)
                  )
                );
              break;
            default:
              reject(
                new Error(
                  "unknown remote_values provider: " + option.remote_values.type
                )
              );
          }
        }
      });
    })
  );
}

module.exports = {
  install,
  setRemoteValues
};
