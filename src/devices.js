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
  images.forEach(image => {
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
    ret.push({
      file: path.join(downloadPath, device, files[i].group, files[i].file),
      partition: files[i].partition
    });
  }
  return ret;
}

function installStep(step) {
  switch (step.type) {
    case "download":
      return () => {
        global.mainEvent.emit("user:write:working", "download");
        global.mainEvent.emit(
          "user:write:status",
          "Downloading " + step.group,
          true
        );
        global.mainEvent.emit("user:write:under", "Downloading");
        return utils
          .downloadFiles(
            addPathToImages(
              step.files,
              global.installProperties.device,
              step.group
            ),
            (progress, speed) => {
              global.mainEvent.emit("user:write:progress", progress * 100);
              global.mainEvent.emit(
                "user:write:speed",
                Math.round(speed * 100) / 100
              );
            },
            (current, total) => {
              utils.log.info("Downloaded file " + current + " of " + total);
            }
          )
          .then(() => {
            global.mainEvent.emit("user:write:working", "particles");
            global.mainEvent.emit("user:write:under", "Verifying download");
            global.mainEvent.emit("user:write:progress", 0);
            global.mainEvent.emit("user:write:speed", 0);
          })
          .catch(error => {
            utils.log.error("download error: " + error);
            mainEvent.emit("user:no-network");
          });
      };
    case "adb:format":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit(
          "user:write:status",
          "Preparing system for installation",
          true
        );
        global.mainEvent.emit(
          "user:write:under",
          "Formatting " + step.partition
        );
        return adb.waitForDevice().then(() => adb.format(step.partition));
      };
    case "adb:reboot":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Rebooting");
        global.mainEvent.emit(
          "user:write:under",
          "Rebooting to " + step.to_state
        );
        return adb.reboot(step.to_state);
      };
    case "fastboot:flash":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Flashing firmware", true);
        global.mainEvent.emit(
          "user:write:under",
          "Flashing firmware partitions using fastboot"
        );
        return fastboot.flashArray(
          addPathToFiles(step.flash, global.installProperties.device)
        );
      };
    case "fastboot:erase":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Cleaning up", true);
        global.mainEvent.emit(
          "user:write:under",
          "Erasing " + step.partition + " partition"
        );
        return fastboot.erase(step.partition);
      };
    case "fastboot:boot":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Rebooting");
        global.mainEvent.emit(
          "user:write:under",
          "Your device is being rebooted..."
        );
        return fastboot.boot(
          path.join(
            downloadPath,
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
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Updating system", true);
        global.mainEvent.emit(
          "user:write:under",
          "Applying fastboot update zip. This may take a while..."
        );
        return fastboot.update(
          path.join(
            downloadPath,
            global.installProperties.device,
            step.group,
            step.file
          ),
          global.installProperties.settings.wipe
        );
      };
    case "fastboot:reboot_bootloader":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Rebooting", true);
        global.mainEvent.emit("user:write:under", "Rebooting to bootloader");
        return fastboot.rebootBootloader();
      };
    case "fastboot:reboot":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Rebooting", true);
        global.mainEvent.emit("user:write:under", "Rebooting system");
        return fastboot.reboot();
      };
    case "fastboot:continue":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Continuing boot", true);
        global.mainEvent.emit("user:write:under", "Resuming boot");
        fastboot.continue();
      };
    case "user_action":
      return () => {
        return new Promise(function(resolve, reject) {
          global.mainEvent.emit(
            "user:action",
            global.installConfig.user_actions[step.action],
            () => {
              switch (step.action) {
                case "recovery":
                case "system":
                  global.mainEvent.emit("user:write:working", "particles");
                  global.mainEvent.emit(
                    "user:write:status",
                    "Waiting for device",
                    true
                  );
                  global.mainEvent.emit(
                    "user:write:under",
                    "Adb is scanning for devices"
                  );
                  function adbWait() {
                    return adb
                      .waitForDevice()
                      .then(resolve)
                      .catch(() =>
                        mainEvent.emit("user:connection-lost", adbWait)
                      );
                  }
                  return adbWait();
                case "bootloader":
                  global.mainEvent.emit("user:write:working", "particles");
                  global.mainEvent.emit(
                    "user:write:status",
                    "Waiting for device",
                    true
                  );
                  global.mainEvent.emit(
                    "user:write:under",
                    "Fastboot is scanning for devices"
                  );
                  function fastbootWait() {
                    return fastboot
                      .waitForDevice()
                      .then(resolve)
                      .catch(() =>
                        mainEvent.emit("user:connection-lost", fastbootWait)
                      );
                  }
                  return fastbootWait();
                default:
                  resolve();
                  break;
              }
            }
          );
        });
      };
    default:
      throw new Error("unrecognized step type: " + step.type);
  }
}

function assembleInstallSteps(steps) {
  var installPromises = [];
  steps.forEach(step => {
    installPromises.push(() => {
      return new Promise(function(resolve, reject) {
        if (
          step.condition &&
          global.installProperties.settings[step.condition.var] !=
            step.condition.value
        ) {
          // If the condition is not met, no need to do anything
          utils.log.debug("skipping step: " + JSON.stringify(step));
          resolve();
        } else {
          utils.log.debug("running step: " + JSON.stringify(step));
          function restartInstall() {
            install(steps);
          }
          function runStep() {
            installStep(step)()
              .then(() => {
                resolve();
                utils.log.debug(step.type + " done");
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
                } else if (
                  step.type.includes("fastboot") &&
                  error.message.includes("lock")
                ) {
                  global.mainEvent.emit("user:oem-lock", runStep);
                } else if (error.message.includes("low power")) {
                  global.mainEvent.emit("user:low-power");
                } else if (
                  error.message.includes("no device") ||
                  error.message.includes("device offline") ||
                  error.message.includes("No such device") ||
                  error.message.includes("connection lost")
                ) {
                  mainEvent.emit(
                    "user:connection-lost",
                    step.resumable ? runStep : restartInstall
                  );
                } else if (error.message.includes("Killed")) {
                  reject(); // Used for exiting the installer
                } else {
                  utils.errorToUser(error, step.type, restartInstall, runStep);
                }
              });
          }
          runStep();
        }
      });
    });
  });

  installPromises.push(() => {
    global.mainEvent.emit("user:write:done");
    global.mainEvent.emit(
      "user:write:status",
      global.installConfig.operating_systems[global.installProperties.osIndex]
        .name + " successfully installed!",
      false
    );
    global.mainEvent.emit(
      "user:write:under",
      global.installConfig.operating_systems[global.installProperties.osIndex]
        .success_message || "All done! Enjoy exploring your new OS!"
    );
  });

  return installPromises;
}

function install(steps) {
  var installPromises = assembleInstallSteps(steps);
  // Actually run the steps
  installPromises
    .reduce(
      (promiseChain, currentFunction) => promiseChain.then(currentFunction),
      Promise.resolve()
    )
    .catch(() => {}); // errors can be ignored here, since this is exclusively used for killing the promise chain
}

// AW : Return the total partition size of system+user
function getUserSystemFileSize() {
  var fileSize = 0;
  return new Promise(function(resolve, reject) {
    adb
      .getState()
      .then(stdout => {
        var system = "";
        var user = "";
        if (stdout == "device") {
          system = "/userdata/system-data";
          user = "/userdata/user-data";
        } else {
          system = "/data/system-data";
          user = "/data/user-data";
        }
        adb
          .getFileSize(user)
          .then(stdout => {
            utils.log.debug("Returned userdata FileSize is " + stdout + " Ko");
            fileSize = stdout;
            global.Backup.usersize = fileSize;
            adb
              .getFileSize(system)
              .then(stdout => {
                fileSize = fileSize + stdout;
                global.Backup.systemsize = stdout;
                utils.log.debug(
                  "Returned systemdata FileSize is " +
                    global.Backup.systemsize +
                    " Ko"
                );
                utils.log.debug(
                  "Returned Total FileSize is " + fileSize + " Ko"
                );
                global.Backup.TotalSize = fileSize; //resolve(fileSize)
                resolve();
              })
              .catch(reject); // system file size error
          })
          .catch(reject); // user filesize error
      })
      .catch(reject); // adb state error
  });
}

// AW : Return the total used space for system+user data on Ubuntu os only
async function getDeviceUsedSpaceForBackup() {
  // Error to handle : No such file or directory
  // --output=used: No such file or directory

  var res = await adb.shell("df -hBG / --output=used|tail -n1");
  var res2 = await adb.shell("df -hBG /userdata --output=used|tail -n1");
  res = parseFloat(res);
  res2 = parseFloat(res2);
  return res + res2;
}

// AW : Check if /data/user-data is present and mount it if not.
function mountPartToBackup(device) {
  utils.log.info("mountPartToBackup");
  return new Promise(function(resolve, reject) {
    var data_partition = "";
    switch (device) {
      case "turbo":
        data_partition = "/dev/block/sda44";
        break;
      default:
        data_partition = "/data";
        break;
    }
    utils.log.info("device partition: " + data_partition);
    adb
      .shell("ls /data|grep system-data")
      .then(stdout => {
        utils.log.info("ls ok");
        if (stdout) {
          resolve();
        } else {
          utils.log.info("nothing found");
          adb
            .shell("mount " + data_partition + " /data")
            .then(stdout => {
              utils.log.info("mounted");
              resolve();
            })
            .catch(reject); // mount
          resolve();
        }
      })
      .catch(e => {
        adb
          .shell("mount " + data_partition + " /data")
          .then(stdout => {
            utils.log.info("Partition has been mounted");
            resolve();
          })
          .catch(e => {
            reject("Unable to mount partition " + data_partition + " " + e);
          }); // mount
        //reject("Partition not mounted "+e);
      }); //ls
  });
}

// Check if we can restore the backup (checking available size)
function isBackupRestorable(backup) {
  return adb
    .getTotalSize("/userdata")
    .then(tot => {
      utils.log.info(
        "Backup size:" +
          (backup.config.systemsize + backup.config.usersize) +
          ", device size:" +
          tot
      );
      if (tot > backup.config.systemsize + backup.config.usersize) return true;
      else return false;
    })
    .catch(err => {
      return false;
    });
}

module.exports = {
  isBackupRestorable: isBackupRestorable,
  getDeviceUsedSpaceForBackup: getDeviceUsedSpaceForBackup,
  getUserSystemFileSize: getUserSystemFileSize,
  mountPartToBackup: mountPartToBackup,
  waitForDevice: () => {
    adb
      .waitForDevice()
      .then(() => {
        adb
          .getDeviceName()
          .then(device => {
            global.api
              .resolveAlias(device)
              .then(resolvedDevice => {
                global.mainEvent.emit("device:detected", resolvedDevice);
              })
              .catch(error => {
                utils.log.error("getDeviceName error: " + error);
                mainEvent.emit("user:no-network");
              });
          })
          .catch(error => {
            utils.errorToUser(error, "get device name");
          });
      })
      .catch(e => utils.log.debug("no device detected: " + e));
  },
  getOsSelects: osArray => {
    // Can't be moved to support custom config files
    var osSelects = [];
    for (var i = 0; i < osArray.length; i++) {
      osSelects.push(
        '<option name="' + i + '">' + osArray[i].name + "</option>"
      );
    }
    return osSelects;
  },
  install: install,
  setRemoteValues: osInstructs => {
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
                    "unknown remote_values provider: " +
                      option.remote_values.type
                  )
                );
            }
          }
        });
      })
    );
  }
};
