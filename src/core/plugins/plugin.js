"use strict";

/*
 * Copyright (C) 2020-2021 UBports Foundation <info@ubports.com>
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

const { CancelablePromise } = require("cancelable-promise");

/**
 * UBports Installer plugin
 * @abstract
 * @property {Props} props properties
 * @param {String} cachePath cache path
 * @param {EventEmitter} event event
 * @param {Object} log logger
 */
class Plugin {
  /**
   * @constructs Plugin
   * @param {Props} props properties
   * @param {String} cachePath cache path
   * @param {EventEmitter} event event
   * @param {Object} log logger
   * @param {Object} settings settings manager
   */
  constructor(props, cachePath, event, log, settings) {
    this.props = props;
    this.cachePath = cachePath;
    this.event = event;
    this.log = log;
    this.settings = settings;
  }

  /**
   * initialize plugin
   * Return true if the plugin was initialized successfully.
   * If a plugin finds that it will be unable to function correctly, it can
   * report this failure in one of two ways. A plugin may return false from
   * its init() promise to indicate that it should not be called again, but the
   * exceptional circumstance that it experienced was handled. For example, if
   * the plugin reports an exception message directly to the user, it should
   * return false. A plugin may throw an error from its init() promise to
   * indicate that it should not be called again _and_ that the thrown error
   * should be shown to the user.
   * @virtual
   * @returns {Promise<Boolean>}
   */
  init() {
    return Promise.resolve(true);
  }

  /**
   * abort all running tasks
   * @virtual
   * @returns {Promise}
   */
  abort() {
    return Promise.resolve();
  }

  /**
   * wait for a device
   * @virtual
   * @returns {CancelablePromise<String>}
   */
  wait() {
    return new CancelablePromise(() => {});
  }
}

module.exports = Plugin;
