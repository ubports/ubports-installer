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

const { Command } = require("commander");
const cli = new Command();
const log = require("./log.js");
const packageInfo = require("../../package.json");

const description = `UBports Installer (${packageInfo.version}) ${
  packageInfo.package || "source"
} for ${process.platform}
${packageInfo.license} ${packageInfo.author}
${packageInfo.description}
${packageInfo.homepage}`;

cli
  .version(packageInfo.version)
  .name(packageInfo.package ? packageInfo.name : "npm start --")
  .usage("[-f <file>] [-v[v] [-i]")
  .description(description)
  .option(
    "-f, --file <file>",
    "Override the official config by loading a YAML local file"
  )
  .option(
    "-v, --verbose",
    "Print debugging information. Multiple -v options increase the verbosity",
    (_, prev) => Math.min(prev + 1, 3),
    0
  )
  .option(
    "-i, --inspect",
    "Enable electron's web debugger to inspect the frontend",
    false
  )
  .option(
    "--systemimage <url>",
    "Set a custom systemimage server url",
    "https://system-image.ubports.com/"
  )
  .parse(process.argv);

log.setLevel(cli.opts().verbose || 0);

module.exports = cli.opts();
