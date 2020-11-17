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

const log = require("./log.js");
const { ipcMain } = require("electron");

/**
 * error handling
 */
class ErrorHandler {
  /**
   * die. expire. succumb. perish. decease. depart.
   * @param {Error} error error or message
   * @param {Number} code exit code
   */
  die(error, code = -1) {
    if (error) log.error(error);
    process.exit(code);
  }

  /**
   * Show an error to the user
   * @param {Error} error error or message
   * @param {String} errorLocation location of the error
   * @param {Function} restart callback
   * @param {Function} ignore callback
   */
  toUser(error, errorLocation, restart, ignore) {
    const errorString = `Error: ${errorLocation || "Unknown"}: ${error}`;
    log.error(
      errorString + (error.stack ? "\nstack trace: " + error.stack : "")
    );
    global.mainEvent.emit("user:error", errorString, restart, ignore);
  }
}

const errorHandler = new ErrorHandler();

// Exit process with optional non-zero exit code
ipcMain.on("die", exitCode => {
  errorHandler.die(null, exitCode);
});

module.exports = errorHandler;
