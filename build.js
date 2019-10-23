#!/usr/bin/env node

"use strict"

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const builder = require("electron-builder")
const cli = require("commander");
const unzip = require("unzipper");
const path = require("path");
const fs = require("fs-extra");
const download = require('download');
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
  return [{
    url: platformToolsUrls[cli.os],
    path: platformToolsPath,
    target: cli.os
  }];
}

function extractPlatformTools(platformToolsArray, callback) {
  var i = platformToolsArray[0];
  fs.createReadStream(path.join(i.path, path.basename(i.url))).pipe(unzip.Extract({
    path: path.join(i.path, i.target + "_tmp")
  })).on("close", () => {
    fs.move(path.join(i.path, i.target + "_tmp", "platform-tools"), path.join(i.path, i.target), {
      overwrite: true
    }, (e) => {
      fs.removeSync(path.join(i.path, i.target + "_tmp"));
      if (i.target != "win") {
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
  case "win":
    targetOs = Platform.WINDOWS;
    buildConfig = Object.assign(buildConfig, {
        "win": {
          "target": ["portable"],
          "icon": "build/icons/icon.ico"
        }
      }
    );
    break;
  case "mac":
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
    if (cli.os != "mac") {
      console.log(cli.package + " can only be built on macOS!");
      process.exit(1);
    }
    break;
  case "exe":
    if (cli.os != "win") {
      console.log(cli.package + " can only be built on Windows!");
      process.exit(1);
    }
    break;
  case "":
    break;
  default:
    if (!cli.downloadOnly) {
      console.log("Building " + cli.package + " is not configured!");
      process.exit(1);
    } else {
      break;
    }
}

var build = () => {
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
}

// Download platform tools
if (cli.platformTools) {
  download(getAndroidPlatformTools()[0].url,getAndroidPlatformTools()[0].path).then(() => {
    console.log('files downloaded!');
    extractPlatformTools(getAndroidPlatformTools(), () => {
      console.log("Platform tools downloaded successfully!");
      if (!cli.downloadOnly) build();
    });
  }).catch(() => {
    console.error("Failed to download files!");
    process.exit(1);
  });
} else {
  build();
}
