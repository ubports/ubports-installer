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

const mainEvent = require("../../lib/mainEvent.js");
const { fastboot } = require("../../lib/deviceTools.js");

/**
 * fastboot plugin
 */
class FastbootPlugin {
  /**
   * oem unlock
   * @param {Object} step {code_url}
   */
  oem_unlock(step) {
    const code_url = step ? step.code_url : null;
    return new Promise((resolve, reject) =>
      mainEvent.emit("user:oem-lock", false, code_url, code =>
        fastboot
          .oemUnlock(code)
          .then(resolve)
          .catch(err => {
            if (err.message.includes("enable unlocking")) {
              mainEvent.emit("user:oem-lock", true, code_url, code =>
                fastboot
                  .oemUnlock(code)
                  .then(resolve)
                  .catch(reject)
              );
            } else {
              reject(err);
            }
          })
      )
    );
  }

  /**
   * flashing unlock
   */
  flashing_unlock() {
    return new Promise((resolve, reject) =>
      mainEvent.emit("user:flashing-lock", () =>
        fastboot
          .flashingUnlock()
          .then(resolve)
          .catch(reject)
      )
    );
  }
  /* required by core:user_action
  wait() {
    mainEvent.emit("user:write:working", "particles");
    mainEvent.emit(
      "user:write:status",
      "Waiting for device",
      true
    );
    mainEvent.emit(
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
  }
  */
}

module.exports = new FastbootPlugin();
