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
const branding = require("./branding.json");

/**
 * Wrap the packaged application to avoid having to use double dashes -- before passing command-line arguments
 * @param {any} context - context
 */
module.exports = async function (context) {
  const distDir = context.appOutDir;
  var wrapperScript;

  if (context.targets.find(target => target.name === "deb")) {
    wrapperScript = `#!/bin/bash
      /opt/${branding.executable}/${branding.executable}.bin --no-sandbox "$@"
    `;
  } else if (context.targets.find(target => target.name === "appImage")) {
    wrapperScript = `#!/bin/bash
      "\${BASH_SOURCE%/*}"/${branding.executable}.bin --no-sandbox "$@"
    `;
  } else {
    console.log("no wrapper needed");
    return;
  }

  fs.moveSync(
    path.join(distDir, `${branding.executable}`),
    path.join(distDir, `${branding.executable}.bin`)
  );
  fs.writeFileSync(path.join(distDir, branding.executable), wrapperScript);
  fs.chmodSync(path.join(distDir, branding.executable), 0o765);
};
