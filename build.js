#!/usr/bin/env node

"use strict"

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const builder = require("electron-builder")
const cli = require("commander");
const utils = require("./src/utils");
const unzip = require("unzipper");
const path = require("path");
const fs = require("fs-extra");
const events = require("events");
class event extends events {}
const Platform = builder.Platform
const platformToolsPath = "./platform-tools"
const platformToolsUrls = {
  "linux": "https://dl.google.com/android/repository/platform-tools-latest-linux.zip",
  "mac": "https://dl.google.com/android/repository/platform-tools-latest-darwin.zip",
  "win": "https://dl.google.com/android/repository/platform-tools-latest-windows.zip"
}

function getAndroidPlatformTools() {
  var targets = [];
  if (cli.linux) targets.push("linux");
  if (cli.windows) targets.push("win");
  if (cli.mac) targets.push("mac");
  if (targets.length === 0) targets = ["linux", "win", "mac"];
  var downloadArray = [];
  targets.forEach((target) => {
    downloadArray.push({
      url: platformToolsUrls[target],
      path: platformToolsPath,
      target: target
    })
  });
  return downloadArray;
}

function extractPlatformTools(platformToolsArray, callback) {
  var i = platformToolsArray[0];
  fs.createReadStream(path.join(i.path, path.basename(i.url))).pipe(unzip.Extract({
    path: path.join(i.path, i.target + "_tmp")
  })).on("close", () => {
    fs.move(path.join(i.path, i.target + "_tmp", "platform-tools"), path.join(i.path, i.target), {
      overwrite: true
    }, (e) => {
      fs.removeSync(path.join(i.path, i.target + "_tmp"))
      if (i.target !== "win") {
        fs.chmodSync(path.join(i.path, i.target, "fastboot"), 0o755);
        fs.chmodSync(path.join(i.path, i.target, "adb"), 0o755);
      }
      if (platformToolsArray.length <= 1) {
        callback()
      } else {
        platformToolsArray.shift();
        extractPlatformTools(platformToolsArray, callback);
      }
    });
  });
}

cli
  .version(require('./package.json').version)
  .usage('./build.js -o <os> -p <package> [options]')
  .option('-o, --os <os>', 'Target operating system')
  .option('-p, --package [package]', 'Target package')
  .option('-e, --extra-metadata [JSON]', 'Inject JSON into package.json', JSON.parse, "")
  .option('-d, --download-only', 'Only download platform tools', undefined, false)
  .option('-n, --no-platform-tools', 'Build without platform tools', undefined, false)
  .parse(process.argv)

var targetOs;
var buildConfig = require("./buildconfig-generic.json");

// --- --- --- --- --- --- BEGIN --- --- --- --- --- ---

cli.parse(process.argv);

// Validate and configure operating system
switch (cli.os) {
  case "linux":
    targetOs = Platform.LINUX;
    buildConfig = Object.assign(buildConfig, {
        "linux": {
          "target": cli.package,
          "icon": "build/icons",
          "synopsis": "Install Ubuntu Touch on UBports devices",
          "category": "Utility"
        },
        "deb": {
          "depends": ["gconf2", "gconf-service", "libnotify4", "libappindicator1", "libxtst6", "libnss3", "android-tools-adb", "android-tools-fastboot"]
        }
      }
    );
    break;
  case "windows":
    targetOs = Platform.WINDOWS;
    buildConfig = Object.assign(buildConfig, {
        "win": {
          "target": ["portable"],
          "icon": "build/icons/icon.ico"
        }
      }
    );
    break;
  case "macos":
    targetOs = Platform.MAC;
    buildConfig = Object.assign(buildConfig, {
        "mac": {
          "target": "dmg",
          "icon": "build/icons/icon.icns",
          "category": "public.app-category.utilities"
        }
      }
    );
    break;
  default:
    console.log("Please specify a target operating system!");
    process.exit(1);
}

// Configure package
switch (cli.package) {
  case "AppImage":
  case "deb":
  case "dir":
    if (cli.os != "linux") {
      console.log(cli.package + " can only be built on Linux!");
      process.exit(1);
    }
    break;
  case "dmg":
    if (cli.os != "macos") {
      console.log(cli.package + " can only be built on macOS!");
      process.exit(1);
    }
    break;
  case "exe":
    if (cli.os != "windows") {
      console.log(cli.package + " can only be built on Windows!");
      process.exit(1);
    }
    break;
  case "":
    break;
  default:
    console.log("Building " + cli.package + " is not configured!");
    process.exit(1);
}

// Download platform tools
if (cli.platformTools) {
  const downloadEvent = new event();
  utils.downloadFiles(getAndroidPlatformTools(), downloadEvent);
  downloadEvent.on("download:done", () => {
    extractPlatformTools(getAndroidPlatformTools(), () => {
      console.log("Platform tools downloaded successfully!");
    });
  });
  downloadEvent.on("download:error", (r) => {
    console.log("Download error " + r);
    process.exit(1);
  });
  downloadEvent.on("error", (r) => {
    console.log("Error: " + r);
    process.exit(1);
  });
  downloadEvent.on("download:start", (r) => {
    console.log("Starting download of " + r + " files");
  });
  downloadEvent.on("download:next", (i) => {
    console.log(`Downloading next file, ${i} left`);
  });
  downloadEvent.on("download:progress", (i) => {
    process.stdout.write(`Downloading file, ${Math.ceil(i.percent*100)}% complete\r`);
  });
}

// Build
if (!cli.downloadOnly) {
  builder.build({
      targets: builder.createTargets([targetOs]),
      config: Object.assign(buildConfig,
        { "extraMetadata":
          (cli.package ?
            Object.assign(cli.extraMetadata, { "package": cli.package }) :
            cli.extraMetadata
          )
        }
      )
  }).then(() => {
      console.log("Done");
  }).catch((e) => {
    if(e.message.indexOf("GitHub Personal Access Token is not set") !== -1) {
      console.log("Done");
      process.exit(0);
    } else {
      console.log(e);
      process.exit(1);
    }
  });
}
