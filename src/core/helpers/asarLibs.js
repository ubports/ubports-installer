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
const packageInfo = require("../../../package.json");

/**
 * Resolve a module to require an unpacked asar file
 * HACK: Oh my fucking god. This is stupid. This is, in fact, so stupid, that i almost cannot believe that i will have to commit this as-is. But here goes: We've long known that executing binaries in the asar package is not possible, so the binaries need to be unpacked. We can not, however, require the unpacked lib, hence we do a stupid hack to get the normal binary from node_modules when running from source and the unpacked one otherwise. I hate everything about this, but it works. If someone knows a better way, i'll be forever grateful.
 * @private
 * @returns {String}
 */
function asarLibPathHack(lib) {
  return packageInfo.package
    ? path.join(__dirname, "../../../../app.asar.unpacked/node_modules/", lib)
    : lib;
}

module.exports = {
  asarLibPathHack,
  DeviceTools: require(asarLibPathHack("promise-android-tools"))
};
