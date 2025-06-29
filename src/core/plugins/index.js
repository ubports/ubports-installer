"use strict";

/*
 * Copyright (C) 2020-2022 UBports Foundation <info@ubports.com>
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

const AdbPlugin = require("./adb/plugin.js");
const AsteroidOsPlugin = require("./asteroid_os/plugin.js");
const LineageOSPlugin = require("./lineage_os/plugin.js");
const PostmarketOSPlugin = require("./postmarketos/plugin.js");
const CorePlugin = require("./core/plugin.js");
const FastbootPlugin = require("./fastboot/plugin.js");
const HeimdallPlugin = require("./heimdall/plugin.js");
const SystemimagePlugin = require("./systemimage/plugin.js");
const { HierarchicalAbortController } = require("promise-android-tools");

/**
 * Index of UBports Installer plugins
 * @property {Props} props props reference
 * @property {Object} plugins plugins namespace
 * @property {AdbPlugin} plugins.adb adb plugin
 * @property {AsteroidOsPlugin} plugins.asteroid_os AteroidOS plugin
 * @property {LineageOSPlugin} plugins.lineage_os LineageOS plugin
 * @property {PostmarketOSPlugin} plugins.postmarketos postmarketOS plugin
 * @property {CorePlugin} plugins.core core plugin
 * @property {FastbootPlugin} plugins.fastboot fastboot plugin
 * @property {HeimdallPlugin} plugins.heimdall heimdall plugin
 * @property {SystemimagePlugin} plugins.systemimage systemimage plugin
 * @property {HierarchicalAbortController} plugins.contoller controller for signalling
 */
class PluginIndex {
  constructor(props, cachePath, mainEvent, log, settings, session, controller) {
    this.props = props;
    this.log = log;
    this.settings = settings;
    this.session = session;
    this.event = mainEvent;
    this.controller = controller;
    const pluginArgs = [props, cachePath, this.event, log, settings];
    this.plugins = {
      adb: new AdbPlugin(...pluginArgs),
      asteroid_os: new AsteroidOsPlugin(...pluginArgs),
      lineage_os: new LineageOSPlugin(...pluginArgs),
      postmarketos: new PostmarketOSPlugin(...pluginArgs),
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
      return this.plugins[p][`action__${f}`](action[`${p}:${f}`])
        .then(r => this.session.set(...Object.entries(action)[0]) || r)
        .catch(error => {
          this.session.set(...Object.entries(action)[0], error);
          throw { error, action: `${p}:${f}` };
        });
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
              this.log.warn(`Failed to initialize plugin ${name}, disabling`);
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
   * detect devices using all plugins
   * @returns {Promise}
   */
  wait() {
    this.log.debug("Starting to wait");

    return Promise.any(
      this.getPluginMappable().map(([pluginName, plugin]) => {
        return plugin.wait(this.controller.signal).then(name => {
          this.log.debug(`wait resolved for ${pluginName} with: ${name}`);
          if (!name) return Promise.reject();

          this.controller.abort();
          return Promise.resolve(name);
        });
      })
    );
  }

  __pluginErrorHandler(name, error) {
    if (error.name === "AbortError") {
      this.log.verbose(`Aborting ${name}: ${error}`);
      return;
    }
    try {
      error.message = JSON.stringify({
        message: JSON.parse(error.message)?.message || error.message,
        name
      });
    } catch (e) {
      error.message = JSON.stringify({
        message: error.message,
        name
      });
    }
    throw error;
  }
}

module.exports = PluginIndex;
