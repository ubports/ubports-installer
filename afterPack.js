"use strict";

/*
 * Copyright (C) 2020 UBports Foundation <info@ubports.com>
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

const fs = require("fs-extra");
const path = require("path");
const { Arch } = require("electron-builder");

/**
 * Make the x86 android tools discoverable on arm. android-tools-bin resolves
 * arm64 to its "arm" directory, but ships no native binaries there for windows
 * or darwin, so alias it to the x86 tools, which run under emulation. Does
 * nothing on platforms that do ship native arm binaries.
 * @param {any} context - context
 */
function aliasArmTools(context) {
  const os = context.electronPlatformName;
  const toolsDir = path.join(
    context.packager.getResourcesDir(context.appOutDir),
    "app.asar.unpacked/node_modules/android-tools-bin/dist",
    os
  );

  if (fs.existsSync(path.join(toolsDir, "arm"))) return;

  fs.copySync(path.join(toolsDir, "x86"), path.join(toolsDir, "arm"));
  console.log(`aliased android-tools-bin ${os}/x86 to ${os}/arm`);
}

/**
 * Wrap the packaged application to avoid having to use double dashes -- before passing command-line arguments
 * @param {any} context - context
 */
module.exports = async function (context) {
  const distDir = context.appOutDir;
  var wrapperScript;

  if (context.arch === Arch.arm64 || context.arch === Arch.armv7l) {
    aliasArmTools(context);
  }

  if (context.targets.find(target => target.name === "deb")) {
    wrapperScript = `#!/bin/bash
      /opt/ubports-installer/ubports-installer.bin --no-sandbox "$@"
    `;
  } else if (context.targets.find(target => target.name === "appImage")) {
    wrapperScript = `#!/bin/bash
      "\${BASH_SOURCE%/*}"/ubports-installer.bin --no-sandbox "$@"
    `;
  } else {
    console.log("no wrapper needed");
    return;
  }

  fs.moveSync(
    path.join(distDir, "ubports-installer"),
    path.join(distDir, "ubports-installer.bin")
  );
  fs.writeFileSync(path.join(distDir, "ubports-installer"), wrapperScript);
  fs.chmodSync(path.join(distDir, "ubports-installer"), 0o765);
};
