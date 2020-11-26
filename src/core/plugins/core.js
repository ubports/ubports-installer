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

/**
 * core plugin
 */
class CorePlugin {
  /**
   * core:group action
   * @param {Array} group array of steps
   * @returns {Promise}
   */
  group(group) {
    return Promise.resolve(group.length ? group : null);
  }

  /**
   * core:user_action action
   * @param {Object} action action
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @returns {Promise}
   */
  user_action({ action }, settings, user_actions) {
    return new Promise(function(resolve, reject) {
      mainEvent.emit("user:action", user_actions[action], () => {
        switch (action) {
          case "recovery":
          case "system":
            resolve([{ actions: [{ "adb:wait": null }] }]);
            break;
          case "bootloader":
            resolve([{ actions: [{ "fastboot:wait": null }] }]);
            break;
          case "download":
            resolve([{ actions: [{ "heimdall:wait": null }] }]);
            break;
          default:
            resolve();
            break;
        }
      });
    });
  }
}

module.exports = new CorePlugin();
