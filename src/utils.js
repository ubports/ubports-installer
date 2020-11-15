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

const axios = require("axios");
const sudo = require("sudo-prompt");
const fs = require("fs-extra");
const path = require("path");
const util = require("util");
global.packageInfo = require("../package.json");

fs.ensureDir(getUbuntuTouchDir());

function getLatestInstallerVersion() {
  return axios
    .get(
      "https://api.github.com/repos/ubports/ubports-installer/releases/latest",
      {
        json: true,
        headers: { "User-Agent": "axios" }
      }
    )
    .then(r => r.data.tag_name)
    .catch(log.error);
}

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
      if (error) log.warn("setting udev rules failed");
      else log.debug("udev rules set");
    }
  );
}

function getUpdateAvailable() {
  return new Promise((resolve, reject) => {
    getLatestInstallerVersion()
      .then(latestVersion => {
        if (latestVersion != global.packageInfo.version) resolve();
        else reject();
      })
      .catch(resolve);
  });
}

function getUbuntuTouchDir() {
  var osCacheDir;
  switch (process.platform) {
    case "linux":
      osCacheDir = path.join(process.env.HOME, ".cache");
      break;
    case "darwin":
      osCacheDir = path.join(process.env.HOME, "Library/Caches");
      break;
    case "win32":
      osCacheDir = process.env.APPDATA;
      break;
    default:
      throw Error("Unknown platform " + process.platform);
  }
  return path.join(osCacheDir, "ubports");
}

function cleanInstallerCache() {
  fs.emptyDir(getUbuntuTouchDir());
}

function die(e) {
  console.log(e); // FIXME
  process.exit(-1);
}

function errorToUser(error, errorLocation, restart, ignore) {
  var errorString =
    "Error: " + (errorLocation ? errorLocation : "Unknown") + ": " + error;
  console.log(
    //FIXME
    errorString + (error.stack ? "\nstack trace: " + error.stack : "")
  );
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
  cleanInstallerCache,
  errorToUser,
  getUbuntuTouchDir,
  setUdevRules,
  getUpdateAvailable,
  die,
  unpack: util.promisify(require(asarLibPathHack("7zip-min")).unpack)
};
