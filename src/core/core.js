"use strict";

/*
 * Copyright (C) 2017-2021 UBports Foundation <info@ubports.com>
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
const path = require("path");
const fs = require("fs-extra");
const YAML = require("yaml");
const mainEvent = require("../lib/mainEvent.js");
const { path: cachePath } = require("../lib/cache.js");
const log = require("../lib/log.js");
const errors = require("../lib/errors.js");
const window = require("../lib/window.js");
const api = require("./helpers/api.js");
const PluginIndex = require("./plugins/index.js");

/**
 * properties
 * @typedef {Object} Props
 * @property {Object} config installer config file object
 * @property {Object} os operating_system config
 * @property {Object} settings settings for the run
 */

/**
 * UBports Installer core. Parses config files to run actions from plugins.
 * @property {Props} props properties object
 * @property {PluginIndex} plugins installer plugins
 */
class Core {
  constructor() {
    this.props = {};
    this.reset();
    this.plugins = new PluginIndex(this.props, cachePath, mainEvent, log);
  }

  /**
   * reset run properties
   */
  reset() {
    this.props = {
      config: null,
      os: null,
      settings: {}
    };
  }

  /**
   * prepare the installer: start adb server and get device selects or read config
   * @param {String} [file] config file
   * @returns {Promise}
   */
  prepare(file) {
    return Promise.all([
      this.readConfigFile(file),
      this.plugins.init().catch(e => errors.toUser(e, "initializing plugins"))
    ]).then(() => {
      if (this.props.config) {
        this.selectOs();
      } else {
        const wait = this.plugins
          .wait()
          .catch(e => errors.toUser(e, "plugin wait()"))
          .then(device => api.resolveAlias(device))
          .catch(
            e =>
              new Promise(() => {
                log.debug(`failed to resolve device name: ${e}`);
                mainEvent.emit("user:no-network");
              })
          )
          .then(device => {
            if (device) {
              log.info(`device detected: ${device}`);
              this.setDevice(device);
            }
          });
        ipcMain.once("device:selected", () => (wait ? wait.cancel() : null));
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
    });
  }

  /**
   * kill subprocesses in plugins
   */
  kill() {
    this.reset();
    return this.plugins.kill();
  }

  /**
   * set config from object
   * @param {Object} config installer config
   */
  setConfig(config) {
    return Promise.resolve().then(() => (this.props.config = config));
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

  readConfigFile(file) {
    return file
      ? Promise.resolve(
          path.isAbsolute(file) ? file : path.join(process.cwd(), file)
        )
          .then(file => fs.readFileSync(file).toString())
          .then(content => YAML.parse(content))
          .then(config => this.setConfig(config))
          .catch(error => errors.toUser(error, "reading config file"))
      : Promise.resolve();
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
          this.props.config,
          this.props.config.operating_systems.map((os, i) => ({
            value: i,
            name: os.name
          }))
        )
      );
  }

  /**
   * ensure unlock steps before we proceed
   * @returns {Promise}
   */
  unlock() {
    return this.props.config.unlock && this.props.config.unlock.length
      ? new Promise((resolve, reject) =>
          mainEvent.emit(
            "user:unlock",
            this.props.config.unlock,
            this.props.config.user_actions,
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
      .then(() => (this.props.os = this.props.config.operating_systems[index]))
      .then(() =>
        log.info(
          `Installing ${this.props.os.name} on your ${this.props.config.name} (${this.props.config.codename})`
        )
      )
      .then(() => this.prerequisites())
      .then(() => this.eula())
      .then(() => this.configure())
      .catch(error => this.handle(error, "preparing"))
      .then(() =>
        this.run([...this.props.os.steps, { actions: [{ "core:end": null }] }])
      );
  }

  /**
   * ensure prerequisites are fulfilled
   * @returns {Promise}
   */
  prerequisites() {
    return this.props.os.prerequisites && this.props.os.prerequisites.length
      ? new Promise((resolve, reject) =>
          mainEvent.emit(
            "user:prerequisites",
            this.props.os.prerequisites,
            this.props.config.user_actions,
            resolve
          )
        ).then(() => this.delay(500))
      : null;
  }

  /**
   * enforce the end-user license agreement if necessary
   * @returns {Promise}
   */
  eula() {
    return this.props.os.eula
      ? new Promise((resolve, reject) =>
          mainEvent.emit("user:eula", this.props.os.eula, resolve)
        ).then(() => this.delay(500))
      : null;
  }

  /**
   * configure if necessary
   * @returns {Promise}
   */
  configure() {
    return this.props.os.options && this.props.os.options.length
      ? Promise.resolve(log.info("configuring..."))
          .then(() =>
            Promise.all(this.props.os.options.map(o => this.setRemoteValues(o)))
          )
          .then(
            () =>
              new Promise((resolve, reject) =>
                mainEvent.emit("user:configure", this.props.os.options, resolve)
              )
          )
          .then(settings => {
            this.props.settings = settings;
            log.info(`settings: ${JSON.stringify(this.props.settings)}`);
          })
      : log.debug("nothing to configure");
  }

  /**
   * set remote_values on an options object
   * @param {Object} option option object
   */
  setRemoteValues(option) {
    return option.remote_values
      ? this.plugins.remote_value(option)
      : Promise.resolve(option);
  }

  /**
   * run a chain of installation steps
   * @param {Array} steps installation steps
   * @returns {Promise}
   */
  run(steps) {
    if (!(steps && steps.length)) return Promise.resolve();
    return steps
      .map(step => () => this.step(step))
      .reduce((chain, next) => chain.then(next), Promise.resolve())
      .catch(error => {
        // used for killing the run, no actual errors should be escalated here
        log.debug(`run killed with: ${JSON.stringify(error)}`);
        log.warn("aborting run...");
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
          .catch(e => this.handle(e.error || e, e.action || "unknown", step))
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
    return this.plugins
      .action(action)
      .then(substeps => (substeps ? this.run(substeps) : null));
  }

  /**
   * Handle an error
   * @param {Error} error error thrown
   * @param {Object} location action
   */
  handle(error, location, step) {
    log.debug(`attempting to handle ${error}`);
    if (step && step.optional) {
      return;
    } else if (step && step.fallback) {
      return this.actions(step.fallback);
    } else if (error.message.includes("low battery")) {
      return new Promise((resolve, reject) => mainEvent.emit("user:low-power"));
    } else if (
      error.message.includes("bootloader locked") ||
      error.message.includes("enable unlocking")
    ) {
      return this.step(this.props.config.handlers.bootloader_locked).then(() =>
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
      return this.props.settings[expression.var] === expression.value;
    }
  }

  /**
   * resolves after a delay to give the UI a chance to catch up
   * @property {Number} [delay] delay in ms
   * @returns {Promise}
   */
  delay(delay = 250) {
    return new Promise(function (resolve) {
      setTimeout(resolve, delay);
    });
  }
}

const core = new Core();

// the user selected an os
ipcMain.on("os:selected", (_, index) => core.install(index));

// a device was selected
ipcMain.on("device:selected", (_, device) => {
  log.info(`device selected: ${device}`);
  core.setDevice(device);
});

module.exports = core;
