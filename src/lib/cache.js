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

const path = require("path");
const fs = require("fs-extra");

/**
 * cache controller
 */
class Cache {
  constructor() {
    switch (process.platform) {
      case "darwin":
        this.path = path.join(process.env.HOME, "Library/Caches", "ubports");
        break;
      case "win32":
        this.path = path.join(process.env.APPDATA, "ubports");
        break;
      case "linux":
      default:
        this.path = path.join(process.env.HOME, ".cache", "ubports");
    }
    this.ensure();
  }

  /**
   * clean the cache directory
   * @returns {Promise}
   */
  clean() {
    return fs.emptyDir(this.path);
  }

  /**
   * create the cache directory if it does not exist already
   * @returns {Promise}
   */
  ensure() {
    return fs.ensureDir(this.path);
  }
}

module.exports = new Cache();
