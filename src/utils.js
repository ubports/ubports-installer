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

const sudo = require("sudo-prompt");
const path = require("path");
const log = require("./lib/log.js");
const util = require("util");
global.packageInfo = require("../package.json");

function setUdevRules() {
  sudo.exec(
    "cp " +
      path.join(__dirname, "../build/10-ubports.rules") +
      " /etc/udev/rules.d/ && " +
      '(udevadm control --reload-rules || echo "") && ' +
      '(udevadm trigger || echo "") && ' +
      '(service udev restart || echo "")',
    {
      name: "UBports Installer",
      icns: path.join(__dirname, "../build/icons/icon.icns")
    },
    error => {
      if (error) log.warn(`setting udev rules failed: ${error}`);
      else log.debug("udev rules set");
    }
  );
}

function die(e) {
  log.error(e);
  process.exit(-1);
}

function errorToUser(error, errorLocation, restart, ignore) {
  const errorString = `Error: ${errorLocation || "Unknown"}: ${error}`;
  log.error(errorString + (error.stack ? "\nstack trace: " + error.stack : ""));
  global.mainEvent.emit("user:error", errorString, restart, ignore);
}

// HACK: Oh my fucking god. This is stupid. This is, in fact, so stupid, that i almost cannot believe that i will have to commit this as-is. But here goes: We've long known that executing binaries in the asar package is not possible, so the binaries need to be unpacked. We can not, however, require the unpacked lib, hence we do a stupid hack to get the normal binary from node_modules when running from source and the unpacked one otherwise. I hate everything about this, but it works. If someone knows a better way, i'll be forever grateful.
function asarLibPathHack(lib) {
  return global.packageInfo.package
    ? path.join(__dirname, "../../app.asar.unpacked/node_modules/", lib)
    : lib;
}

module.exports = {
  asarLibPathHack,
  errorToUser,
  setUdevRules,
  die,
  unpack: util.promisify(require(asarLibPathHack("7zip-min")).unpack)
};
