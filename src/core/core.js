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
const fs = require("fs-extra");
const path = require("path");

/**
 * UBports Installer core. Parses config files to run actions from plugins.
 */
class Core {
  constructor() {
    this.plugins = {};
    fs.readdirSync(path.join(__dirname, "plugins")).forEach(plugin => {
      this.plugins[plugin.replace(".js", "")] = require(`./plugins/${plugin}`);
    });
  }

  /**
   * run a chain of installation steps
   * @param {Array} steps installation steps
   * @returns {Promise}
   */
  run(steps, settings, handlers) {
    return steps
      .map(step => () => this.step(step, settings))
      .reduce((chain, next) => chain.then(next), Promise.resolve())
      .catch(() => null); // errors can be ignored here, since this is exclusively used for killing the promise chain
  }

  /**
   *run one installation step
   * @param {Object} step step object
   * @param {Object} settings settings object
   */
  step(step, settings) {
    return this.evaluate(step.condition, settings)
      ? this.delay().then(() =>
          log.debug(`running step ${JSON.stringify(step)}`)
        )
      : Promise.resolve().then(() =>
          log.debug(`skipping step ${JSON.stringify(step)}`)
        );
  }

  /**
   * Evaluate a conditional expression against the settings
   * @param {Object} expression conditional expression
   * @param {Object} settings settings object
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
   * resolves after a delay
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
