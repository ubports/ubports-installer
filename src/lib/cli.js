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

const cli = require("commander");
const path = require("path");
const fs = require("fs-extra");
const YAML = require("yaml");
const log = require("./log.js");
const packageInfo = require("../../package.json");
const core = require("../core/core.js");

const description = `UBports Installer (${
  packageInfo.version
}) ${packageInfo.package || "source"} for ${process.platform}
${packageInfo.license} ${packageInfo.author}
${packageInfo.description}
${packageInfo.homepage}`;

cli
  .version(packageInfo.version)
  .name(packageInfo.package ? packageInfo.name : "npm start --")
  .usage("[-f <file>] [-v[v] [-d]")
  .description(description)
  .option(
    "-f, --file <file>",
    "Override the official config by loading a YAML local file"
  )
  .option(
    "-v, --verbose",
    "Print debugging information. Multiple -v options increase the verbosity",
    (_, prev) => prev + 1,
    0
  )
  .option(
    "-d, --debug",
    "Enable electron's web debugger to inspect the frontend"
  )
  .parse(process.argv);

log.setLevel(cli.verbose);

if (cli.file) {
  try {
    core.setConfig(
      YAML.parse(
        fs
          .readFileSync(
            path.isAbsolute(cli.file)
              ? cli.file
              : path.join(process.cwd(), cli.file)
          )
          .toString()
      )
    );
  } catch (error) {
    console.error(`failed to read ${cli.file}: ${error}`);
    process.exit(1);
  }
}

module.exports = cli;
