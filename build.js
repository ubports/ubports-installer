#!/usr/bin/env node

"use strict"

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const builder = require("electron-builder")
const cli = require("commander");
const utils = require("./src/utils");
const unzip = require("unzip");
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

const setEvents = (downloadEvent) => {
  downloadEvent.on("download:error", (r) => {
    console.log("Download error " + r);
  });
  downloadEvent.on("error", (r) => {
    console.log("Error: " + r);
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

function getLinuxTargets() {
  if (cli.buildToDir) {
    return ["dir"];
  }

  var linuxTargets = [];
  if (!cli.ignoreDeb)
    linuxTargets.push("deb");
  if (!cli.ignoreAppimage)
    linuxTargets.push("AppImage");
  if (!cli.ignoreFreebsd)
    linuxTargets.push("freebsd");
  if (!cli.ignorePacman)
    linuxTargets.push("pacman");
  if (!cli.ignoreRpm)
    linuxTargets.push("rpm");

  if (linuxTargets.length !== 0) {
    return linuxTargets;
  } else {
    console.log("linux targets cannot be null")
    process.exit(1)
  }
}

function build() {
  builder.build({
      targets: builder.createTargets(targets),
      config: buildConfig
    }
  )
  .then(() => {
      console.log("Done");
    }
  )
  .catch((e) => {
    if(e.message.indexOf("GitHub Personal Access Token is not set") !== -1) {
      console.log("Done");
      process.exit(0);
    } else {
      console.log(e);
      process.exit(1);
    }
  })
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
};

function downloadPlatformTools() {
  const downloadEvent = new event();
  setEvents(downloadEvent);
  utils.downloadFiles(getAndroidPlatformTools(), downloadEvent);
  downloadEvent.on("download:done", () => {
    extractPlatformTools(getAndroidPlatformTools(), () => {
      console.log("Platform tools downloaded successfully!");
      if(!cli.downloadOnly) build();
    });
  });
};

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
  .version(1)
  .option('-l, --linux', 'Build for Linux')
  .option('-w, --windows', 'Build for Windows')
  .option('-m, --mac', 'Build for Mac')
  .option('-d, --download-only', 'Only download platformTools')
  .option('-D, --ignore-deb', "Do not build deb")
  .option('-A, --ignore-appimage', "Do not build appimage")
  .option('-F, --ignore-freebsd', "Do not build freebsd")
  .option('-P, --ignore-pacman', "Do not build pacman")
  .option('-R, --ignore-rpm', "Do not build rpm")
  .option('-b, --build-to-dir', "Build only to dir")
  .option('-n, --no-platform-tools', "Build without platform tools")
  .parse(process.argv);

var targets = [];
var buildConfig = require("./buildconfig-generic.json");

if (cli.linux) {
  targets.push(Platform.LINUX);
  buildConfig = Object.assign(buildConfig, {
      "linux": {
        "target": getLinuxTargets(),
        "icon": "build/icons",
        "synopsis": "Install Ubuntu Touch on UBports devices",
        "category": "Utility"
      },
      "deb": {
        "depends": ["gconf2", "gconf-service", "libnotify4", "libappindicator1", "libxtst6", "libnss3", "android-tools-adb", "android-tools-fastboot"]
      },
      "freebsd": {
        "depends": ["android-tools-adb", "android-tools-fastboot"],
        "packageCategory": "Utility",
        "vendor": "UBports Foundation",
        "maintainer": "UBports Foundation"
      },
      "pacman": {
        "depends": ["android-sdk-platform-tools"],
        "packageCategory": "Utility",
        "vendor": "UBports Foundation",
        "maintainer": "UBports Foundation"
      },
      "rpm": {
        "depends": ["android-tools"],
        "packageCategory": "Utility",
        "vendor": "UBports Foundation",
        "maintainer": "UBports Foundation"
      }
    }
  );
}
if (cli.windows) {
  targets.push(Platform.WINDOWS);
  buildConfig = Object.assign(buildConfig, {
      "win": {
        "target": ["portable"],
        "icon": "build/icons/icon.ico"
      }
    }
  );
}
if (cli.mac) {
  targets.push(Platform.MAC);
  buildConfig = Object.assign(buildConfig, {
      "mac": {
        "target": "dmg",
        "icon": "build/icons/icon.icns",
        "category": "public.app-category.utilities"
      }
    }
  );
}

if (targets.length === 0) targets = [Platform.MAC, Platform.WINDOWS, Platform.LINUX];

if (cli.platformTools) downloadPlatformTools();
else build();
