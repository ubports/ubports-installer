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

const log = require("../lib/log.js");
const errors = require("../lib/errors.js");
const fs = require("fs-extra");
const path = require("path");

/**
 * UBports Installer core. Parses config files to run actions from plugins.
 */
class Core {
  constructor() {
    this.plugins = {};
    fs.readdirSync(path.join(__dirname, "plugins"))
      .filter(p => !p.includes("spec"))
      .forEach(plugin => {
        this.plugins[
          plugin.replace(".js", "")
        ] = require(`./plugins/${plugin}`);
      });
  }

  /**
   * run a chain of installation steps
   * @param {Array} steps installation steps
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @param {Object} handlers handlers object
   * @returns {Promise}
   */
  run(steps, settings, user_actions, handlers) {
    return steps
      .map(step => () => this.step(step, settings, user_actions, handlers))
      .reduce((chain, next) => chain.then(next), Promise.resolve())
      .catch(() => null); // errors can be ignored here, since this is exclusively used for killing the promise chain
  }

  /**
   *run one installation step
   * @param {Object} step step object
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @param {Object} handlers handlers object
   * @returns {Promise}
   */
  step(step, settings, user_actions, handlers) {
    return this.evaluate(step.condition, settings)
      ? this.delay(1)
          .then(() => log.verbose(`running step ${JSON.stringify(step)}`))
          .then(() =>
            this.actions(step.actions, settings, user_actions, handlers)
          )
          .catch(({ error, action }) =>
            this.handle(error, action, step, settings, user_actions, handlers)
          )
      : this.delay(1).then(() =>
          log.verbose(`skipping step ${JSON.stringify(step)}`)
        );
  }

  /**
   * Run multiple actions
   * @param {Array<Object>} actions array of actions
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @param {Object} handlers handlers object
   * @returns {Promise}
   */
  actions(actions, settings, user_actions, handlers) {
    return actions.reduce(
      (prev, curr) =>
        prev.then(() => this.action(curr, settings, user_actions, handlers)),
      Promise.resolve()
    );
  }

  /**
   * Run one action
   * @param {Object} action one action
   * @param {Object} settings settings object
   * @param {Object} user_actions user_actions object
   * @param {Object} handlers handlers object
   * @returns {Promise}
   */
  action(action, settings, user_actions, handlers) {
    return Promise.resolve(Object.keys(action)[0].split(":")).then(
      ([plugin, func]) => {
        if (this.plugins[plugin] && this.plugins[plugin][func]) {
          log.verbose(`running ${plugin} action ${func}`);
          return this.plugins[plugin][func](
            action[`${plugin}:${func}`],
            settings,
            user_actions
          )
            .catch(error => {
              throw { error, action: `${plugin}:${func}` };
            })
            .then(substeps =>
              substeps
                ? this.run(substeps, settings, user_actions, handlers)
                : null
            );
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
  handle(error, location, step, settings, user_actions, handlers) {
    log.debug(`attempting to handle handling ${error}`);
    if (error && error.message.includes("killed")) {
      throw error; // Used for exiting the installer
    } else {
      return new Promise((resolve, reject) =>
        errors.toUser(
          error,
          location,
          () => resolve(this.step(step, settings, user_actions, handlers)), // try again
          () => resolve(null) // ignore
        )
      );
    }
  }

  /**
   * Evaluate a conditional expression against the settings
   * @param {Object} expression conditional expression
   * @param {Object} settings settings object
   * @returns {Boolean}
   */
  evaluate(expression, settings) {
    if (!expression) {
      // no condition
      return true;
    } else if (expression.AND) {
      // conjunction
      return expression.AND.reduce(
        (prev, curr) => prev && this.evaluate(curr, settings),
        true // TODO short-circuit execution
      );
    } else if (expression.OR) {
      // disjunction
      return expression.OR.reduce(
        (prev, curr) => prev || this.evaluate(curr, settings),
        false // TODO short-circuit execution
      );
    } else if (expression.NOT) {
      // negation
      return !this.evaluate(expression.NOT, settings);
    } else {
      // identity
      return settings[expression.var] === expression.value;
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

module.exports = new Core();
