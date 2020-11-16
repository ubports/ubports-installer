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

const { unpack } = require("./lib/asarLibs.js");
const systemImage = require("./system-image");
const utils = require("./utils");
const path = require("path");
const fs = require("fs-extra");
const { download, checkFile } = require("progressive-downloader");
const { path: cachePath } = require("./lib/cache.js");
const deviceTools = require("./lib/deviceTools.js");
const { adb, fastboot, heimdall } = deviceTools;

function addPathToFiles(files, device) {
  var ret = [];
  for (var i = 0; i < files.length; i++) {
    ret.push({
      file: path.join(cachePath, device, files[i].group, files[i].file),
      partition: files[i].partition,
      flags: files[i].flags,
      raw: files[i].raw
    });
  }
  return ret;
}

function installStep(step) {
  switch (step.type) {
    case "download":
      return () => {
        return download(
          step.files.map(file => ({
            ...file,
            checksum:
              file.checksum && file.checksum.sum && file.checksum.algorithm
                ? file.checksum
                : file.checksum
                ? { sum: file.checksum, algorithm: "sha256" }
                : null,
            partition: file.type,
            path: path.join(
              cachePath,
              global.installProperties.device,
              step.group,
              path.basename(file.url)
            ),
            file: path.join(path.basename(file.url))
          })),
          (progress, speed) => {
            global.mainEvent.emit("user:write:progress", progress * 100);
            global.mainEvent.emit(
              "user:write:speed",
              Math.round(speed * 100) / 100
            );
            global.mainEvent.emit("user:write:under", "Downloading");
          },
          (current, total) => {
            log.info(`Downloaded file ${current} of ${total}`);
            global.mainEvent.emit(
              "user:write:status",
              `${current} of ${total} files downloaded and verified`,
              true
            );
          },
          activity => {
            log.info(activity);
            switch (activity) {
              case "downloading":
                log.info(`downloading ${step.group} files`);
                global.mainEvent.emit("user:write:working", "download");
                break;
              case "preparing":
                log.info(`checking previously downloaded ${step.group} files`);
                global.mainEvent.emit("user:write:working", "particles");
                global.mainEvent.emit(
                  "user:write:status",
                  "Preparing download",
                  true
                );
                global.mainEvent.emit(
                  "user:write:under",
                  `Checking ${step.group} files...`
                );
              default:
                break;
            }
          }
        )
          .then(() => {
            global.mainEvent.emit("user:write:working", "particles");
            global.mainEvent.emit("user:write:progress", 0);
            global.mainEvent.emit("user:write:speed", 0);
          })
          .catch(error => {
            log.error("download error: " + error);
            mainEvent.emit("user:no-network");
          });
      };
    case "manual_download":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Manual download");
        global.mainEvent.emit(
          "user:write:under",
          `Checking ${step.group} files...`
        );
        return checkFile(
          {
            checksum: step.file.checksum,
            path: path.join(
              cachePath,
              global.installProperties.device,
              step.group,
              step.file.name
            )
          },
          false
        ).then(ok => {
          if (!ok) {
            return new Promise(function(resolve, reject) {
              global.mainEvent.emit(
                "user:manual_download",
                step.file,
                step.group,
                downloadedFilePath => {
                  fs.ensureDir(
                    path.join(
                      cachePath,
                      global.installProperties.device,
                      step.group
                    )
                  )
                    .then(() =>
                      fs.copyFile(
                        downloadedFilePath,
                        path.join(
                          cachePath,
                          global.installProperties.device,
                          step.group,
                          step.file.name
                        )
                      )
                    )
                    .then(() =>
                      checkFile(
                        {
                          checksum: step.file.checksum,
                          path: path.join(
                            cachePath,
                            global.installProperties.device,
                            step.group,
                            step.file.name
                          )
                        },
                        true
                      )
                    )
                    .then(ok =>
                      ok ? resolve() : reject(new Error("checksum mismatch"))
                    )
                    .catch(reject);
                }
              );
              global.mainEvent.emit(
                "user:write:under",
                `Manual download required!`
              );
            });
          }
        });
      };
    case "unpack":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit(
          "user:write:status",
          `Unpacking ${step.group}`,
          true
        );
        global.mainEvent.emit("user:write:under", `Unpacking...`);
        let basepath = path.join(
          cachePath,
          global.installProperties.device,
          step.group
        );
        return Promise.all(
          step.files.map(file =>
            unpack(
              path.join(basepath, file.archive),
              path.join(basepath, file.dir)
            )
          )
        ).catch(error => {
          throw new Error(`Unpack error: ${error}`);
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
        return adb.wait().then(() => adb.format(step.partition));
      };
    case "adb:sideload":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit(
          "user:write:status",
          `Sideloading ${step.group}`,
          true
        );
        global.mainEvent.emit(
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
            p => global.mainEvent.emit("user:write:progress", p * 100)
          )
          .then(() => global.mainEvent.emit("user:write:progress", 0));
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
        return fastboot
          .wait()
          .then(() =>
            fastboot.flash(
              addPathToFiles(step.flash, global.installProperties.device),
              p => global.mainEvent.emit("user:write:progress", p * 100)
            )
          )
          .then(() => global.mainEvent.emit("user:write:progress", 0));
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
    case "fastboot:format":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Cleaning up", true);
        global.mainEvent.emit(
          "user:write:under",
          "Formatting " + step.partition + " partition"
        );
        return fastboot.format(step.partition, step.partitionType, step.size);
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
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Updating system", true);
        global.mainEvent.emit(
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
        return fastboot.continue();
      };
    case "fastboot:set_active":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Continuing boot", true);
        global.mainEvent.emit("user:write:under", "Resuming boot");
        return fastboot.setActive(step.slot);
      };
    case "heimdall:flash":
      return () => {
        global.mainEvent.emit("user:write:working", "particles");
        global.mainEvent.emit("user:write:status", "Flashing firmware", true);
        global.mainEvent.emit(
          "user:write:under",
          "Flashing firmware partitions using heimdall"
        );
        return heimdall.flash(
          addPathToFiles(step.flash, global.installProperties.device)
        );
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
                      .hasAccess()
                      .then(access => {
                        if (access) resolve();
                        else mainEvent.emit("user:connection-lost", adbWait);
                      })
                      .catch(e => {
                        log.warn(e);
                        resolve();
                      });
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
                      .hasAccess()
                      .then(access => {
                        if (access) resolve();
                        else
                          mainEvent.emit("user:connection-lost", fastbootWait);
                      })
                      .catch(e => {
                        log.warn(e);
                        resolve();
                      });
                  }
                  return fastbootWait();
                case "download":
                  global.mainEvent.emit("user:write:working", "particles");
                  global.mainEvent.emit(
                    "user:write:status",
                    "Waiting for device",
                    true
                  );
                  global.mainEvent.emit(
                    "user:write:under",
                    "Heimdall is scanning for devices"
                  );
                  function heimdallWait() {
                    return heimdall
                      .hasAccess()
                      .then(access => {
                        if (access) resolve();
                        else
                          mainEvent.emit("user:connection-lost", heimdallWait);
                      })
                      .catch(e => {
                        log.warn(e);
                        resolve();
                      });
                  }
                  return heimdallWait();
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
          log.debug("skipping step: " + JSON.stringify(step));
          resolve();
        } else {
          log.debug("running step: " + JSON.stringify(step));
          function restartInstall() {
            install(steps);
          }
          const smartRestart = step.resumable ? runStep : restartInstall;
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
                  global.mainEvent.emit("user:low-power");
                } else if (
                  error.message.includes("bootloader locked") ||
                  error.message.includes("enable unlocking")
                ) {
                  global.mainEvent.emit("user:oem-lock", runStep);
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
                        utils.log.warn(
                          `automatic reconnection ${++reconnections}`
                        );
                        runStep();
                      })
                      .catch(error => {
                        utils.log.warn(
                          `failed to reconnect automatically: ${error}`
                        );
                        mainEvent.emit("user:connection-lost", smartRestart);
                      });
                  } else {
                    utils.log.warn(
                      "maximum automatic reconnection attempts exceeded"
                    );
                    mainEvent.emit("user:connection-lost", smartRestart);
                  }
                } else if (error.message.includes("killed")) {
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

module.exports = {
  waitForDevice: () =>
    deviceTools
      .wait()
      .then(() => deviceTools.getDeviceName())
      .then(device =>
        global.api.resolveAlias(device).catch(e => {
          log.debug(`failed to resolve device name: ${e}`);
          mainEvent.emit("user:no-network");
        })
      )
      .then(resolvedDevice =>
        global.mainEvent.emit("device:detected", resolvedDevice)
      )
      .catch(error => {
        if (!error.message.includes("no device"))
          utils.errorToUser(error, "get device name");
      }),
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
