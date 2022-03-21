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
const LineageOSPlugin = require("./lineage_os/plugin.js");
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
 * @property {LineageOSPlugin} plugins.lineage_os LineageOS plugin
 * @property {CorePlugin} plugins.core core plugin
 * @property {FastbootPlugin} plugins.fastboot fastboot plugin
 * @property {HeimdallPlugin} plugins.heimdall heimdall plugin
 * @property {SystemimagePlugin} plugins.systemimage systemimage plugin
 */
class PluginIndex {
  constructor(props, cachePath, mainEvent, log, settings) {
    this.props = props;
    this.log = log;
    this.settings = settings;
    this.event = mainEvent;
    const pluginArgs = [props, cachePath, this.event, log, settings];
    this.plugins = {
      adb: new AdbPlugin(...pluginArgs),
      asteroid_os: new AsteroidOsPlugin(...pluginArgs),
      lineage_os: new LineageOSPlugin(...pluginArgs),
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
   * returns array containing [name (String): plugin (Plugin)] pairs
   */
  getPluginMappable() {
    return Object.entries(this.plugins);
  }

  /**
   * initialize all plugins
   * @returns {Promise}
   */
  init() {
    return Promise.all(
      this.getPluginMappable().map(([name, plugin]) => {
        return plugin
          .init()
          .then(initSuccessful => {
            if (!initSuccessful) {
              this.log.warn(
                `Disabling plugin ${name} because it failed to initialize with result: ${initSuccessful}`
              );
              delete this.plugins[name];
            }
          })
          .catch(error => {
            delete this.plugins[name];
            return this.__pluginErrorHandler(name, error);
          });
      })
    );
  }

  /**
   * kill all running tasks
   * @returns {Promise}
   */
  kill() {
    return Promise.all(
      this.getPluginMappable().map(([_, plugin]) => plugin.kill())
    );
  }

  /**
   * detect devices using all plugins
   * @returns {Promise}
   */
  wait() {
    const _this = this;
    return new CancelablePromise(function (resolve, reject, onCancel) {
      const waitPromises = _this.getPluginMappable().map(([name, plugin]) => {
        return plugin.wait().catch(error => {
          delete _this.plugins[name];
          return _this.__pluginErrorHandler(name, error);
        });
      });
      CancelablePromise.race(waitPromises)
        .then(state => {
          waitPromises.forEach(p => (p.cancel ? p.cancel() : null));
          resolve(state);
        })
        .catch(e => {
          reject(e);
        });

      onCancel(() =>
        waitPromises.forEach(p => {
          p.cancel();
        })
      );
    });
  }

  __pluginErrorHandler(name, error) {
    const errorJson = {};
    if (error.message) {
      try {
        errorJson = JSON.parse(error.message);
      } catch (e) {
        errorJson.message = error.message;
        if (e instanceof SyntaxError) {
          // pass
        } else {
          this.log.warn(
            `Plugin error handler for plugin ${name} failed to parse error message: ${e}`
          );
        }
      }
    } else {
      this.log.error(
        `Plugin error handler for plugin ${name} failed to parse error: ${error}`
      );
      errorJson.message = error;
    }
    errorJson.name = name;
    throw new Error(JSON.stringify(errorJson));
  }
}

module.exports = PluginIndex;
