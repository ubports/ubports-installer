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

const { webContents } = require("electron");

/**
 * communicate with the main window webContents
 * FIXME if someone has a better idea of how to avoid having to use globals here, i'm listening
 */
class Window {
  /**
   * get main window webContents
   * @returns {Object} electron webContents
   */
  getMain() {
    try {
      return webContents.fromId(1) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * try to send an event to the main window's webContents
   * @param {String} channel channel
   * @param  {...any} args arguments to send
   */
  send(channel, ...args) {
    const main = this.getMain();
    if (main) main.send(channel, ...args);
  }
}

module.exports = new Window();
