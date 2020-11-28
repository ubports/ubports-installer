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

const { ipcMain } = require("electron");
const mainEvent = require("../lib/mainEvent.js");
const log = require("../lib/log.js");
const errors = require("../lib/errors.js");
const window = require("../lib/window.js");
const fs = require("fs-extra");
const path = require("path");
const { adb } = require("../lib/deviceTools.js");
const api = require("../lib/api.js");

// FIXME remove global.installProperties and global.installConfig

/**
 * UBports Installer core. Parses config files to run actions from plugins.
 * @property {Object} plugins installer plugins
 * @property {Object} config installer config file object
 * @property {Object} os operating_system config
 * @property {Object} settings settings for the run
 */
class Core {
  constructor() {
    this.plugins = {};
    fs.readdirSync(path.join(__dirname, "plugins"))
      .filter(p => !p.includes("spec"))
      .forEach(plugin => {
        this.plugins[plugin] = require(`./plugins/${plugin}/plugin.js`);
      });
    this.reset();
  }

  /**
   * reset run properties
   */
  reset() {
    this.config = null;
    this.os = null;
    this.settings = {};
  }

  /**
   * prepare the installer: get device selects and start adb server
   * @returns {Promise}
   */
  prepare() {
    adb.startServer();
    if (this.config) {
      this.selectOs();
    } else {
      api
        .getDeviceSelects()
        .then(out => {
          window.send("device:wait:device-selects-ready", out);
        })
        .catch(e => {
          log.error("getDeviceSelects error: " + e);
          window.send("user:no-network");
        });
    }
  }

  /**
   * set config from object
   * @param {Object} config installer config
   */
  setConfig(config) {
    return Promise.resolve().then(() => (this.config = config));
  }

  /**
   * set device, read config from api
   * @param {String} codename device codename
   */
  setDevice(codename) {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Preparing installation", true);
        mainEvent.emit("user:write:under", `Fetching ${codename} config`);
      })
      .then(() => api.getDevice(codename))
      .then(config => this.setConfig(config))
      .then(() => this.selectOs())
      .catch(() => mainEvent.emit("user:device-unsupported", codename));
  }

  /**
   * ask the user to select an OS
   * @returns {Promise}
   */
  selectOs() {
    return this.delay(1000) // FIXME race condition
      .then(() => this.unlock())
      .then(() =>
        window.send(
          "user:os",
          this.config,
          this.config.operating_systems.map(
            (os, i) => `<option name="${i}">${os.name}</option>`
          )
        )
      );
  }

  /**
   * ensure unlock steps before we proceed
   * @returns {Promise}
   */
  unlock() {
    return this.config.unlock && this.config.unlock.length
      ? new Promise((resolve, reject) =>
          mainEvent.emit(
            "user:unlock",
            this.config.unlock,
            this.config.user_actions,
            resolve
          )
        )
      : null;
  }

  /**
   * install an os
   * @param {Number} index selected operating system
   */
  install(index) {
    return Promise.resolve()
      .then(() => (this.os = this.config.operating_systems[index]))
      .then(() =>
        log.info(
          `Installing ${this.os.name} on your ${this.config.name} (${this.config.codename})`
        )
      )
      .then(() => this.prerequisites())
      .then(() => this.eula())
      .then(() => this.configure())
      .catch(error => this.handle(error, "preparing"))
      .then(() =>
        this.run([...this.os.steps, { actions: [{ "core:end": null }] }])
      );
  }

  /**
   * ensure prerequisites are fulfilled
   * @returns {Promise}
   */
  prerequisites() {
    return this.os.prerequisites && this.os.prerequisites.length
      ? new Promise((resolve, reject) =>
          mainEvent.emit(
            "user:prerequisites",
            this.os.prerequisites,
            this.config.user_actions,
            resolve
          )
        )
      : null;
  }

  /**
   * enforce the end-user license agreement if necessary
   * @returns {Promise}
   */
  eula() {
    return this.os.eula // TODO implement eula in unlock modal
      ? new Promise((resolve, reject) =>
          mainEvent.emit("user:eula", this.os.eula, resolve, reject)
        )
      : null;
  }

  /**
   * configure if necessary
   * @returns {Promise}
   */
  configure() {
    return this.os.options && this.os.options.length
      ? Promise.resolve(log.info("configuring..."))
          .then(() =>
            Promise.all(this.os.options.map(o => this.setRemoteValues(o)))
          )
          .then(
            () =>
              new Promise((resolve, reject) =>
                mainEvent.emit("user:configure", this.os.options, resolve)
              )
          )
          .then(() => log.info(`settings: ${JSON.stringify(this.settings)}`))
      : log.debug("nothing to configure");
  }

  /**
   * set remote_values on an options object
   * @param {Object} option option object
   */
  setRemoteValues(option) {
    return option.remote_values
      ? Promise.resolve(this.parsePluginCall(option.remote_values))
          .then(([plugin, func]) =>
            this.plugins[plugin].remote_values[func](option)
          )
          .then(values => (option.values = values))
      : Promise.resolve(option);
  }

  /**
   * run a chain of installation steps
   * @param {Array} steps installation steps
   * @returns {Promise}
   */
  run(steps) {
    return steps
      .map(step => () => this.step(step))
      .reduce((chain, next) => chain.then(next), Promise.resolve())
      .catch(error => {
        // used for killing the run, no actual errors are escalated here
        log.debug(`run killed with: ${error}`);
        log.warn("aborting run...");
        mainEvent.emit("user:write:working", "particles");
      });
  }

  /**
   *run one installation step
   * @param {Object} step step object
   * @returns {Promise}
   */
  step(step) {
    return this.evaluate(step.condition)
      ? this.delay(1)
          .then(() => log.verbose(`running step ${JSON.stringify(step)}`))
          .then(() => this.actions(step.actions))
          .catch(({ error, action }) => this.handle(error, action, step))
      : this.delay(1).then(() =>
          log.verbose(`skipping step ${JSON.stringify(step)}`)
        );
  }

  /**
   * Run multiple actions
   * @param {Array<Object>} actions array of actions
   * @returns {Promise}
   */
  actions(actions) {
    return actions.reduce(
      (prev, curr) => prev.then(() => this.action(curr)),
      Promise.resolve()
    );
  }

  /**
   * Run one action
   * @param {Object} action one action
   * @returns {Promise}
   */
  action(action) {
    return Promise.resolve(this.parsePluginCall(action)).then(
      ([plugin, func]) => {
        if (
          this.plugins[plugin] &&
          this.plugins[plugin].actions &&
          this.plugins[plugin].actions[func]
        ) {
          log.verbose(`running ${plugin} action ${func}`);
          return this.plugins[plugin].actions[func](
            action[`${plugin}:${func}`],
            this.settings,
            this.config.user_actions
          )
            .catch(error => {
              throw { error, action: `${plugin}:${func}` };
            })
            .then(substeps => (substeps ? this.run(substeps) : null));
        } else {
          throw {
            error: new Error(`Unknown action ${plugin}:${func}`),
            action: `${plugin}:${func}`
          };
        }
      }
    );
  }

  /**
   * Handle an error
   * @param {Error} error error thrown
   * @param {Object} location action
   */
  handle(error, location, step) {
    log.debug(`attempting to handle handling ${error}`);
    if (step.optional) {
      return;
    } else if (step.fallback) {
      return this.actions(step.fallback);
    } else if (error.message.includes("low battery")) {
      return new Promise((resolve, reject) => mainEvent.emit("user:low-power"));
    } else if (
      error.message.includes("bootloader locked") ||
      error.message.includes("enable unlocking")
    ) {
      return this.step(this.config.handlers.bootloader_locked).then(() =>
        this.step(step)
      );
    } else if (error.message.includes("no device")) {
      return new Promise((resolve, reject) =>
        mainEvent.emit("user:connection-lost", () => resolve(this.step(step)))
      );
    } else if (
      error.message.includes("device offline") ||
      error.message.includes("unauthorized")
    ) {
      return this.action({ "adb:reconnect": null });
    } else if (error && error.message.includes("killed")) {
      throw error; // Used for exiting the installer
    } else {
      return new Promise((resolve, reject) =>
        errors.toUser(
          error,
          location,
          () => resolve(this.step(step)), // try again
          () => resolve(null) // ignore
        )
      );
    }
  }

  /**
   * get plugin and call from object
   * @param {Object} call action or remote
   * @returns {Array<String>} [plugin, function]
   */
  parsePluginCall(call) {
    return Object.keys(call)[0].split(":");
  }

  /**
   * Evaluate a conditional expression against the settings
   * @param {Object} expression conditional expression
   * @returns {Boolean}
   */
  evaluate(expression) {
    if (!expression) {
      // no condition
      return true;
    } else if (expression.AND) {
      // conjunction
      return expression.AND.reduce(
        (prev, curr) => prev && this.evaluate(curr),
        true // TODO short-circuit execution
      );
    } else if (expression.OR) {
      // disjunction
      return expression.OR.reduce(
        (prev, curr) => prev || this.evaluate(curr),
        false // TODO short-circuit execution
      );
    } else if (expression.NOT) {
      // negation
      return !this.evaluate(expression.NOT);
    } else {
      // identity
      return this.settings[expression.var] === expression.value;
    }
  }

  /**
   * resolves after a delay to give the UI a chance to catch up
   * @property {Number} [delay] delay in ms
   * @returns {Promise}
   */
  delay(delay = 250) {
    return new Promise(function(resolve) {
      setTimeout(resolve, delay);
    });
  }
}

const core = new Core();

// The user configured the installation
ipcMain.on("option", (_, variable, value) => (core.settings[variable] = value));

// the user selected an os
ipcMain.on("os:selected", (_, index) => core.install(index));

// a device was selected
ipcMain.on("device:selected", (_, device) => {
  log.info(`device selected: ${device}`);
  core.setDevice(device);
});

// a device was detected
mainEvent.on("device:detected", device => {
  log.info(`device detected: ${device}`);
  core.setDevice(device);
});

module.exports = core;
