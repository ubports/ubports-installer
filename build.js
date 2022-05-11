#!/usr/bin/env node

"use strict";

/*
 * Copyright (C) 2017-2021 UBports Foundation <info@ubports.com>
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
const branding = require("./branding.json");


const PLATFORMS = ["darwin", "win32", "linux"];
const PACKAGES = ["deb", "snap", "AppImage", "dmg", "portable", "dir"];
const ARCH = ["armv7l", "x64", "ia32", "arm64"];

cli
  .version(require("./package.json").version)
  .name("./build.js")
  .usage("-o <os> -p <package> -a <arch> [options]") // remember the cant
  .option(
    "-o, --os <os>",
    `Target operating system (${PLATFORMS.join(", ")})`,
    p => (PLATFORMS.includes(p) ? p : process.platform),
    process.platform
  )
  .option(
    "-p, --package <package>",
    `Target package (${PACKAGES.join(", ")})`,
    p => (PACKAGES.includes(p) ? p : "dir"),
    "dir"
  )
  .option(
    "-a, --arch <architecture>",
    `Target architecture (${ARCH.join(", ")})`,
    a => (ARCH.includes(a) ? a : "x64"),
    "x64"
  )
  .option(
    "-e, --extra-metadata [JSON]",
    "extra data for package.json",
    JSON.parse,
    "{}"
  )
  .parse(process.argv);

const opts = cli.opts();

var targetOs;
var buildConfig = {
  appId: branding["app-id"],
  productName: branding.executable,
  copyright: `Copyright © 2017-${new Date().getFullYear()} UBports Foundation`,
  artifactName: "${name}_${version}_${os}_${arch}.${ext}",
  publish: [],
  files: [
    "src/**/*",
    "public/*",
    "public/build/**/*",
    "public/fonts/**/*",
    `${branding.screens}/**/*`,
    `${branding.images}/**/*`,
    "node_modules/**/*",
    `${branding.icons}/icon.*`,
    "branding.json",
    // exclude binaries for other operating systems
    ...PLATFORMS.filter(p => p !== opts.os).map(
      p => `!node_modules/android-tools-bin/dist/${p}`
    ),
    // exclude binaries for other architectures
    `!node_modules/android-tools-bin/dist/**/${
      opts.arch.includes("arm") ? "x86" : "arm"
    }/**`
  ],
  asarUnpack: [
    // Unpack dependencies of pakcages containing binaries
    "node_modules/7zip-min/*", // for 7zip-bin
    "node_modules/jsonfile/**/*", // for fs-extra
    "node_modules/at-least-node/**/*", // for fs-extra
    "node_modules/graceful-fs/**/*", // for fs-extra
    "node_modules/universalify/**/*", // for fs-extra
    "node_modules/fs-extra/**/*", // for promise-android-tools
    "node_modules/cancelable-promise/**/*", // for promise-android-tools
    "node_modules/promise-android-tools/**/*", // for android-tools-bin
    "node_modules/@babel/runtime/**/*" // for android-tools-bin
  ],
  extraMetadata: {
    package: opts.package === "portable" ? "exe" : opts.package,
    ...opts.extraMetadata
  }
};

const target = {
  target: opts.package,
  arch: opts.arch
};

// Validate and configure operating system
switch (opts.os) {
  case "linux":
    targetOs = builder.Platform.LINUX;
    buildConfig = Object.assign(buildConfig, {
      linux: {
        target,
        icon: "build/icons",
        synopsis: `Install ${branding.os} on your device device`,
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
        target,
        icon: "build/icons/icon.ico"
      }
    });
    break;
  case "darwin":
    targetOs = builder.Platform.MAC;
    buildConfig = Object.assign(buildConfig, {
      mac: {
        target,
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
console.log("build", opts.package, "for", opts.arch, opts.os, "or die trying");
build()
  .then(() => console.log("all done!"))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
