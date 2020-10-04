#!/usr/bin/env node

"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const builder = require("electron-builder");
const cli = require("commander");
const path = require("path");
const fs = require("fs-extra");
const util = require("util");
const { download } = require("progressive-downloader");
const unpack = util.promisify(require("7zip-min").unpack);

const platformToolsPath = "./platform-tools";
// FIXME as soon as snappy sorts out it's dns bullshit, remove the hack
const adbFastbootUrl = () =>
  cli.snapcraftHack
    ? "http://people.ubuntu.com/~neothethird/adb-fastboot.zip"
    : `https://dl.google.com/android/repository/platform-tools-latest-${
        cli.os === "mac" ? "darwin" : cli.os === "win" ? "windows" : cli.os
      }.zip`;
// FIXME maybe move back to https://heimdall.free-droid.com
const heimdallUrl = () =>
  `http://people.ubuntu.com/~neothethird/heimdall-${cli.os}.zip`;

var targetOs;
var buildConfig = require("./buildconfig-generic.json");

cli
  .version(require("./package.json").version)
  .usage("./build.js -o <os> -p <package> [options]")
  .option(
    "-o, --os <os>",
    "Target operating system",
    p => (["mac", "win", "linux"].includes(p) ? p : process.platform),
    process.platform
  )
  .option("-p, --package [package]", "Target package", "dir")
  .option(
    "-e, --extra-metadata [JSON]",
    "extra data for package.json",
    JSON.parse,
    ""
  )
  .option("-b, --no-build", "Only download platform tools")
  .option("-d, --no-download", "Skip platform tools download")
  .option(
    "-s, --snapcraft-hack",
    "HACK: Download platform tools from another source, because launchpad's snap builder is fucking stupid"
  )
  .parse(process.argv);

// Validate and configure operating system
switch (cli.os) {
  case "linux":
    targetOs = builder.Platform.LINUX;
    buildConfig = Object.assign(buildConfig, {
      linux: {
        target: cli.package,
        icon: "build/icons",
        synopsis: "Install Ubuntu Touch on UBports devices",
        category: "Utility"
      },
      deb: {
        depends: [
          "gconf2",
          "gconf-service",
          "libnotify4",
          "libappindicator1",
          "libxtst6",
          "libnss3",
          "android-tools-adb",
          "android-tools-fastboot"
        ]
      },
      afterPack: "./afterPack.js"
    });
    break;
  case "win":
    targetOs = builder.Platform.WINDOWS;
    buildConfig = Object.assign(buildConfig, {
      win: {
        target: ["portable"],
        icon: "build/icons/icon.ico"
      }
    });
    break;
  case "mac":
    targetOs = builder.Platform.MAC;
    buildConfig = Object.assign(buildConfig, {
      mac: {
        target: "dmg",
        icon: "build/icons/icon.icns",
        category: "public.app-category.utilities"
      }
    });
    break;
  default:
    console.log("Please specify a target operating system!");
    process.exit(1);
}

// Configure package
if (cli.build) {
  switch (cli.package) {
    case "AppImage":
    case "deb":
      if (cli.os != "linux") {
        console.log(cli.package + " can only be built for Linux!");
        process.exit(1);
      }
      break;
    case "dmg":
      if (cli.os != "mac") {
        console.log(cli.package + " can only be built for macOS!");
        process.exit(1);
      }
      break;
    case "exe":
      if (cli.os != "win") {
        console.log(cli.package + " can only be built for Windows!");
        process.exit(1);
      }
      break;
    case "dir":
      break;
    default:
      console.log("Building " + cli.package + " is not configured!");
      process.exit(1);
  }
}

const build = () =>
  cli.build
    ? builder
        .build({
          targets: builder.createTargets([targetOs]),
          config: Object.assign(buildConfig, {
            extraMetadata: cli.package
              ? Object.assign(cli.extraMetadata, { package: cli.package })
              : cli.extraMetadata
          })
        })
        .then(() => console.log("build complete"))
        .catch(e => {
          if (
            e.message.indexOf("GitHub Personal Access Token is not set") !== -1
          ) {
            console.log("build complete");
          } else {
            throw new Error(`Build error: ${e}`);
          }
        })
    : Promise.resolve().then(() => console.log("build skipped"));

const downloadPlatformTools = () =>
  cli.download
    ? Promise.resolve(fs.emptyDirSync(platformToolsPath)) // HACK fs.emptyDir does not seem to return a promise
        .then(() =>
          download([
            {
              url: heimdallUrl(),
              path: path.join(platformToolsPath, `${cli.os}.zip`)
            },
            {
              url: adbFastbootUrl(),
              path: path.join(platformToolsPath, "adb-fastboot.zip")
            }
          ])
        )
        .then(archives =>
          Promise.all(
            archives.map(a => unpack(a.path, a.path.replace(".zip", "")))
          )
        )
        .then(() =>
          fs.copy(
            path.join(platformToolsPath, "adb-fastboot/platform-tools"),
            path.join(platformToolsPath, cli.os)
          )
        )
        .then(() =>
          cli.os !== "win"
            ? Promise.all(
                ["fastboot", "adb", "mke2fs", "heimdall"].map(executable =>
                  fs.chmod(
                    path.join(platformToolsPath, cli.os, executable),
                    0o755
                  )
                )
              )
            : Promise.resolve()
        )
        .then(() => console.log("download complete"))
    : Promise.resolve().then(() => console.log("download skipped"));

// actual work happens here
downloadPlatformTools()
  .then(() => build())
  .then(() => console.log("all done!"))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
