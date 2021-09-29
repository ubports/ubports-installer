"use strict";

/*
 * Copyright (C) 2021 UBports Foundation <info@ubports.com>
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
const window = require("./window.js");

/**
 * send prompt to the window
 */
class Prompt {
  /**
   * send prompt to the window
   * @param {Object} form form object
   * @returns {Promise<Object>}
   */
  prompt(form) {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString().substr(2, 8);
      window.send("user:prompt", { id, ...form });
      ipcMain.once(`user:prompt:reply:${id}`, (event, data) => resolve(data));
    });
  }
}

module.exports = new Prompt();
