"use strict";

/*
 * Copyright (C) 2020 UBports Foundation <info@ubports.com>
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

const log = require("../../lib/log.js");

const AdbPlugin = require("./adb/plugin.js");
const CorePlugin = require("./core/plugin.js");
const FastbootPlugin = require("./fastboot/plugin.js");
const HeimdallPlugin = require("./heimdall/plugin.js");
const SystemimagePlugin = require("./systemimage/plugin.js");

/**
 * Index of UBports Installer plugins
 * @property {Props} props props reference
 * @property {Object} plugins plugins namespace
 * @property {AdbPlugin} plugins.adb adb plugin
 * @property {CorePlugin} plugins.core core plugin
 * @property {FastbootPlugin} plugins.fastboot fastboot plugin
 * @property {HeimdallPlugin} plugins.heimdall heimdall plugin
 * @property {SystemimagePlugin} plugins.systemimage systemimage plugin
 */
class PluginIndex {
  constructor(props) {
    this.props = props;
    this.plugins = {
      adb: new AdbPlugin(props),
      core: new CorePlugin(props),
      fastboot: new FastbootPlugin(props),
      heimdall: new HeimdallPlugin(props),
      systemimage: new SystemimagePlugin(props)
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
      log.verbose(`running ${p} action ${f}`);
      return this.plugins[p].actions[f](action[`${p}:${f}`]).catch(error => {
        throw { error, action: `${p}:${f}` };
      });
    });
  }

  remote_value(option) {
    return Promise.resolve(this.parsePluginId(option.remote_values))
      .then(([p, f]) => this.plugins[p].remote_values[f](option))
      .then(values => (option.values = values));
  }
}

module.exports = PluginIndex;
