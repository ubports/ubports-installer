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

const PLATFORMS = ["darwin", "win32", "linux"];
const PACKAGES = ["deb", "snap", "AppImage", "dmg", "exe", "dir"];

cli
  .version(require("./package.json").version)
  .usage("./build.js -o <os> -p <package> [options]")
  .option(
    "-o, --os <os>",
    `Target operating system (${PLATFORMS.join(", ")})`,
    p => (PLATFORMS.includes(p) ? p : process.platform),
    process.platform
  )
  .option(
    "-p, --package [package]",
    `Target package (${PACKAGES.join(", ")})`,
    p => (PACKAGES.includes(p) ? p : "dir"),
    "dir"
  )
  .option(
    "-e, --extra-metadata [JSON]",
    "extra data for package.json",
    JSON.parse,
    "{}"
  )
  .parse(process.argv);

var targetOs;
var buildConfig = {
  appId: "com.ubports.installer",
  productName: "ubports-installer",
  copyright: "Copyright © 2017-2020 UBports Foundation",
  publish: [],
  files: [
    "src/**/*",
    "!src/pug/*",
    "node_modules/**/*",
    "build/icons/icon.*",
    ...PLATFORMS.filter(p => p !== cli.os).map(p => `!**/${p}/**`)
  ],
  asarUnpack: [
    // Unpack dependencies of pakcages containing binaries
    "node_modules/7zip-min/*", // for 7zip-bin
    "node_modules/@babel/runtime/**/*" // for android-tools-bin
  ],
  extraMetadata: {
    package: cli.package,
    ...cli.extraMetadata
  }
};

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
          "android-tools-fastboot",
          "heimdall-flash"
        ]
      },
      afterPack: "./afterPack.js"
    });
    break;
  case "win32":
    targetOs = builder.Platform.WINDOWS;
    buildConfig = Object.assign(buildConfig, {
      win: {
        target: ["portable"],
        icon: "build/icons/icon.ico"
      }
    });
    break;
  case "darwin":
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
    break;
}

const build = () =>
  builder
    .build({
      targets: builder.createTargets([targetOs]),
      config: buildConfig
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
console.log("building...");
build()
  .then(() => console.log("all done!"))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
