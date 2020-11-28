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

const winston = require("winston");
const path = require("path");
const { path: cachePath } = require("./cache.js");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  command: 5
};

/**
 * singleton for logging messages to stdout and the console
 */
class Logger {
  /**
   * @constructs Logger
   */
  constructor() {
    winston.addColors({
      error: "red",
      warn: "yellow",
      info: "green",
      verbose: "blue",
      debug: "white",
      command: "grey"
    });

    this.logfile = new winston.transports.File({
      filename: path.join(cachePath, "ubports-installer.log"),
      options: { flags: "w" },
      level: "command"
    });
    this.stdout = new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      level: "info"
    });
    this.winston = winston.createLogger({
      format: winston.format.json(),
      levels,
      transports: [this.logfile, this.stdout]
    });
  }

  /**
   * Get log file contents
   * @returns {Promise<String>} log file contents
   */
  get() {
    const _this = this;
    return new Promise(function(resolve, reject) {
      _this.winston.query(
        {
          limit: 400,
          start: 0,
          order: "asc"
        },
        (err, results) => {
          try {
            if (err) {
              reject(new Error(`Failed to read log: ${err}`));
            } else {
              resolve(
                results.file
                  .map(({ level, message }) => `${level}: ${message}`)
                  .join("\n")
              );
            }
          } catch (err) {
            reject(new Error(`Failed to read log: ${err}`));
          }
        }
      );
    });
  }

  /**
   * update stdout logging level
   * @param {Number} [level] logging level
   */
  setLevel(level = 0) {
    switch (level) {
      case 1:
        this.stdout.level = "verbose";
        break;
      case 2:
        this.stdout.level = "debug";
        break;
      case 3:
        this.stdout.level = "command";
        break;
      default:
        this.stdout.level = "info";
        break;
    }
  }

  /**
   * log an error
   * @param {String} message message to log
   */
  error(message) {
    this.winston.log("error", message);
  }

  /**
   * log a warning
   * @param {String} message message to log
   */
  warn(message) {
    this.winston.log("warn", message);
  }

  /**
   * log an info
   * @param {String} message message to log
   */
  info(message) {
    this.winston.log("info", message);
  }

  /**
   * log a verbose message
   * @param {String} message message to log
   */
  verbose(message) {
    this.winston.log("verbose", message);
  }

  /**
   * log a debug message
   * @param {String} message message to log
   */
  debug(message) {
    this.winston.log("debug", message);
  }

  /**
   * log a command
   * @param {String} message message to log
   */
  command(message) {
    this.winston.log("command", message);
  }
}

module.exports = new Logger();
