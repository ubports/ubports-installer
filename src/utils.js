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
const os = require("os");
const fs = require("fs-extra");
const path = require("path");
const cp = require("child_process");
const psTree = require("ps-tree");
const util = require("util");
global.packageInfo = require("../package.json");

fs.ensureDir(getUbuntuTouchDir());

const platforms = {
  linux: "linux",
  darwin: "mac",
  win32: "win"
};

var log = {
  error: l => {
    global.logger.log("error", l);
  },
  warn: l => {
    global.logger.log("warn", l);
  },
  info: l => {
    global.logger.log("info", l);
  },
  debug: l => {
    global.logger.log("debug", l);
  }
};

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
  log.error(e);
  process.exit(-1);
}

let toolpath = global.packageInfo.package
  ? path.join(
      __dirname,
      "../../app.asar.unpacked/platform-tools",
      platforms[os.platform()]
    )
  : path.join(__dirname, "..", "platform-tools", platforms[os.platform()]);
let processes = [];
function execTool(tool, args, callback) {
  let pid = cp.exec(
    [path.join(toolpath, tool)].concat(args).join(" "),
    {
      maxBuffer: 1024 * 1024 * 2
    },
    (error, stdout, stderr) => {
      global.logger.log(
        "command",
        tool +
          ": " +
          JSON.stringify({
            args: args,
            error: error,
            stdout: stdout,
            stderr: stderr
          })
      );
      callback(error, stdout, stderr);
    }
  );
  processes.push(pid);
  pid.on("exit", () => {
    processes.splice(processes.indexOf(pid), 1);
  });
}

// Since child_process.exec spins up a shell on posix, simply killing the process itself will orphan its children, who then will be adopted by pid 1 and continue running as zombie processes until the end of time.
function killSubprocesses() {
  if (process.platform === "win32") {
    processes.forEach(child => child.kill());
  } else {
    processes.forEach(pid => {
      psTree(pid.pid, function(err, children) {
        cp.spawn("kill", ["-9"].concat(children.map(p => p.PID)));
      });
    });
  }
}

function isSnap() {
  return process.env.SNAP_NAME || false;
}

function errorToUser(error, errorLocation, restart, ignore) {
  var errorString =
    "Error: " + (errorLocation ? errorLocation : "Unknown") + ": " + error;
  utils.log.error(
    errorString + (error.stack ? "\nstack trace: " + error.stack : "")
  );
  global.mainEvent.emit("user:error", errorString, restart, ignore);
}

// HACK: Oh my fucking god. This is stupid. This is, in fact, so stupid, that i almost cannot believe that i will have to commit this as-is. But here goes: We've long known that executing binaries in the asar package is not possible, so the binaries need to be unpacked. We can not, however, require the unpacked lib, hence we do a stupid hack to get the normal binary from node_modules when running from source and the unpacked one otherwise. I hate everything about this, but it works. If someone knows a better way, i'll be forever grateful.
const asarLibPathHack = lib =>
  global.packageInfo.package || isSnap()
    ? path.join(__dirname, "../../app.asar.unpacked/node_modules/", lib)
    : lib;

module.exports = {
  cleanInstallerCache,
  errorToUser,
  log,
  isSnap,
  execTool,
  killSubprocesses,
  getUbuntuTouchDir,
  setUdevRules,
  getUpdateAvailable,
  die,
  unpack: util.promisify(require(asarLibPathHack("7zip-min")).unpack)
};
