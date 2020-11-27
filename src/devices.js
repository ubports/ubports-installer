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
const log = require("./lib/log.js");
const errors = require("./lib/errors.js");
const deviceTools = require("./lib/deviceTools.js");
const { adb } = deviceTools;
const mainEvent = require("./lib/mainEvent.js");

/**
 * Turn steps into a promise chain
 * @param {Array<Object>} steps installation steps
 * @param {Array<Function>}
 */
function assembleInstallSteps(steps) {
  let installPromises = steps.map(step => () =>
    new Promise(function(resolve, reject) {
      if (true) {
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
                // moved
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
              }
            });
        }
        runStep();
      }
    })
  );

  return installPromises;
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
  setRemoteValues
};
