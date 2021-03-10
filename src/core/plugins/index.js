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

const AdbPlugin = require("./adb/plugin.js");
const AsteroidOsPlugin = require("./asteroid_os/plugin.js");
const CorePlugin = require("./core/plugin.js");
const FastbootPlugin = require("./fastboot/plugin.js");
const HeimdallPlugin = require("./heimdall/plugin.js");
const SystemimagePlugin = require("./systemimage/plugin.js");

/**
 * Index of UBports Installer plugins
 * @property {Props} props props reference
 * @property {Object} plugins plugins namespace
 * @property {AdbPlugin} plugins.adb adb plugin
 * @property {AsteroidOsPlugin} plugins.asteroid_os AteroidOS plugin
 * @property {CorePlugin} plugins.core core plugin
 * @property {FastbootPlugin} plugins.fastboot fastboot plugin
 * @property {HeimdallPlugin} plugins.heimdall heimdall plugin
 * @property {SystemimagePlugin} plugins.systemimage systemimage plugin
 */
class PluginIndex {
  constructor(props, cachePath, mainEvent, log) {
    this.props = props;
    this.log = log;
    const pluginArgs = [props, cachePath, mainEvent, log];
    this.plugins = {
      adb: new AdbPlugin(...pluginArgs),
      asteroid_os: new AsteroidOsPlugin(...pluginArgs),
      core: new CorePlugin(...pluginArgs),
      fastboot: new FastbootPlugin(...pluginArgs),
      heimdall: new HeimdallPlugin(...pluginArgs),
      systemimage: new SystemimagePlugin(...pluginArgs)
    };
  }

  /**
   * get plugin and call from object
   * @param {Object} call action or remote
   * @returns {Array<String>} [plugin, function]
   */
  parsePluginId(call) {
    return Object.keys(call)[0].split(":");
  }

  /**
   * run an action
   * @param {Object} action action object
   * @returns {Promise}
   * @throws {Object} {error, action}
   */
  action(action) {
    return Promise.resolve(this.parsePluginId(action)).then(([p, f]) => {
      this.log.verbose(`running ${p} action ${f}`);
      return this.plugins[p][`action__${f}`](action[`${p}:${f}`]).catch(
        error => {
          throw { error, action: `${p}:${f}` };
        }
      );
    });
  }

  /**
   * resolves remote values
   * @returns {Promise}
   */
  remote_value(option) {
    return Promise.resolve(this.parsePluginId(option.remote_values))
      .then(([p, f]) =>
        this.plugins[p] && this.plugins[p][`remote_values__${f}`]
          ? this.plugins[p][`remote_values__${f}`](option)
          : []
      )
      .then(values => (option.values = values));
  }

  /**
   * returns iterable array of all plugins
   * @returns {Array<Object>}
   */
  getPluginArray() {
    return Object.entries(this.plugins).map(([name, plugin]) => plugin);
  }

  /**
   * initialize all plugins
   * @returns {Promise}
   */
  init() {
    return Promise.all(this.getPluginArray().map(plugin => plugin.init()));
  }

  /**
   * kill all running tasks
   * @returns {Promise}
   */
  kill() {
    return Promise.all(this.getPluginArray().map(plugin => plugin.kill()));
  }

  /**
   * detect devices using all plugins
   * @returns {Promise}
   */
  wait() {
    const _this = this;
    return new CancelablePromise(function (resolve, reject, onCancel) {
      const waitPromises = _this.getPluginArray().map(plugin => plugin.wait());
      CancelablePromise.race(waitPromises)
        .then(state => {
          waitPromises.forEach(p => (p.cancel ? p.cancel() : null));
          resolve(state);
        })
        .catch(e => {
          reject(new Error("no device"));
        });

      onCancel(() => waitPromises.forEach(p => p.cancel()));
    });
  }
}

module.exports = PluginIndex;
