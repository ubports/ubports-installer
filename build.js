#!/usr/bin/env node

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

const builder = require("electron-builder");
const cli = require("commander");

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

const build = () =>
  builder
    .build({
      targets: builder.createTargets([targetOs]),
      config: Object.assign(buildConfig, {
        extraMetadata: {
          package: cli.package,
          ...cli.extraMetadata
        }
      })
    })
    .then(() => console.log("build complete"))
    .catch(e => {
      if (e.message.indexOf("GitHub Personal Access Token is not set") !== -1) {
        console.log("build complete");
      } else {
        throw new Error(`Build error: ${e}`);
      }
    });

// actual work happens here
console.log("let's go!");
build()
  .then(() => console.log("all done!"))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
