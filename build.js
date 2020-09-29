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
const download = require("download");
const unpack = util.promisify(require("7zip-min").unpack);

const platformToolsPath = "./platform-tools";
const platformToolsUrl = () =>
  `https://dl.google.com/android/repository/platform-tools-latest-${
    cli.os === "mac" ? "darwin" : cli.os === "win" ? "windows" : cli.os
  }.zip`;
const heimdallUrl = () =>
  `https://heimdall.free-droid.com/heimdall-${cli.os}.zip`;

var targetOs;
var buildConfig = require("./buildconfig-generic.json");

cli
  .version(require("./package.json").version)
  .usage("./build.js -o <os> -p <package> [options]")
  .option("-o, --os <os>", "Target operating system")
  .option("-p, --package [package]", "Target package")
  .option(
    "-e, --extra-metadata [JSON]",
    "Inject JSON into package.json",
    JSON.parse,
    ""
  )
  .option("-b, --no-build", "Only download platform tools", undefined, false)
  .option("-d, --no-download", "Skip platform tools download", undefined, false)
  .option("-r, --re-download", "Re-download platform tools", undefined, false)
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
    case "dir":
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

const downloadAdbFastboot = () =>
  fs.existsSync(path.join(platformToolsPath, cli.os, "fastboot")) &&
  fs.existsSync(path.join(platformToolsPath, cli.os, "adb")) &&
  fs.existsSync(path.join(platformToolsPath, cli.os, "mke2fs"))
    ? Promise.resolve().then(() => console.log("adb/fastboot re-used"))
    : download(platformToolsUrl(), platformToolsPath)
        .then(() => console.log("adb/fastboot downloaded"))
        .then(() =>
          unpack(
            path.join(platformToolsPath, path.basename(platformToolsUrl())),
            path.join(platformToolsPath, cli.os + "_tmp")
          )
        )
        .then(() =>
          fs.copy(
            path.join(platformToolsPath, cli.os + "_tmp", "platform-tools"),
            path.join(platformToolsPath, cli.os),
            { overwrite: true }
          )
        )
        .then(() => console.log("adb/fastboot unpacked"))
        .then(() => fs.remove(path.join(platformToolsPath, cli.os + "_tmp")))
        .catch(e => {
          throw new Error(`Adb/Fastboot failed ${e}`);
        });

const downloadHeimdall = () =>
  fs.existsSync(path.join(platformToolsPath, cli.os, "heimdall"))
    ? Promise.resolve().then(() => console.log("heimdall re-used"))
    : download(heimdallUrl(), platformToolsPath)
        .then(() => console.log("heimdall downloaded"))
        .then(() =>
          unpack(
            path.join(platformToolsPath, path.basename(heimdallUrl())),
            path.join(platformToolsPath, cli.os)
          )
        )
        .then(() => console.log("heimdall unpacked"))
        .catch(e => {
          throw new Error("Heimdall failed", e);
        });

const downloadPlatformTools = () =>
  cli.download
    ? (cli.reDownload ? fs.emptyDir(platformToolsPath) : Promise.resolve())
        .then(() =>
          Promise.all([
            downloadAdbFastboot()
            // downloadHeimdall() TODO uncomment for https://github.com/ubports/ubports-installer/issues/1376
          ])
        )
        .then(() =>
          cli.os !== "win"
            ? Promise.all(
                // TODO include "heimdall" for https://github.com/ubports/ubports-installer/issues/1376
                ["fastboot", "adb", "mke2fs"].map(executable =>
                  fs.chmod(
                    path.join(platformToolsPath, cli.os, executable),
                    0o755
                  )
                )
              )
            : Promise.resolve()
        )
        .then(() => console.log("platform tools complete"))
        .catch(e => {
          throw new Error(e);
        })
    : Promise.resolve().then(() => console.log("platform tools skipped"));

// actual work happens here
downloadPlatformTools()
  .then(() => build())
  .then(() => console.log("all done!"))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
