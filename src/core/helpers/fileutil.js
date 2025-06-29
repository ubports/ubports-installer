"use strict";

/*
 * Copyright (C) UBports Foundation <info@ubports.com>
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

/** @module fileutil */

/**
 * Return a ready to use path for a file using the given path, codename, group and file
 * @param basepath The base path of the file
 * @param codename The codename of the device
 * @param group The group of the file
 * @param file The actual file
 * @returns {string}
 */
const buildPathForTools = (basepath, codename, group, file) => {
  const joinedPath = path.join(basepath, codename, group, file);

  // Surround with quotes to ensure paths with spaces are not broken
  return `"${joinedPath}"`;
};

module.exports = {
  buildPathForTools
};
