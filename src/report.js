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

const axios = require("axios");
const util = require("util");
const { osInfo } = require("systeminformation");
const { GraphQLClient, gql } = require("graphql-request");
require('cross-fetch/polyfill');

const FormData = require("form-data");

function getDeviceString() {
  try {
    return global.installProperties.device
      ? `%60${global.installProperties.device}%60`
      : "Not detected";
  } catch (e) {
    return "unknown";
  }
}

function getTargetOsString() {
  try {
    return !util.isUndefined(global.installProperties.osIndex)
      ? global.installConfig.operating_systems[global.installProperties.osIndex]
          .name
      : "Not yet set";
  } catch (e) {
    return "unknown";
  }
}

function getSettingsString() {
  try {
    `%60${JSON.stringify(global.installProperties.settings || {})}%60`;
  } catch (e) {
    return "unknown";
  }
}

function getPackageString() {
  try {
    return `%60${
      process.env.SNAP_NAME ? "snap" : global.packageInfo.package || "source"
    }%60`;
  } catch (e) {
    return "unknown";
  }
}

function getOsString(hostOs) {
  return [
    hostOs.distro,
    hostOs.release,
    hostOs.codename,
    hostOs.platform,
    hostOs.kernel,
    hostOs.arch,
    hostOs.build,
    hostOs.servicepack
  ]
    .filter(i => i)
    .join(" ");
}

function getDebugInfo(reason, logurl, runurl, hostOs) {
  return `UBports Installer: %60${global.packageInfo.version}%60 %0D%0A
Device: ${getDeviceString()} %0D%0A
OS to install: ${getTargetOsString()} %0D%0A
Settings: ${getSettingsString()} %0D%0A
Package: ${getPackageString()} %0D%0A
Operating System: ${getOsString(hostOs)} %0D%0A
NodeJS version: %60${process.version}%60 %0D%0A
OPEN-CUTS run: ${runurl || "*failed to post run*"} %0D%0A
Error log: ${logurl || "*failed to post log*"} %0D%0A
%60%60%60 %0D%0A
${reason} %0D%0A
%60%60%60 %0D%0A%0D%0A
<!-- please add any info that might be useful to reproduce this issue -->`;
}

/**
 * Get log file contents
 * @async
 * @returns {String} log file contents
 * @throws if reading or parsing the file failed
 */
async function getLog() {
  return new Promise(function(resolve, reject) {
    global.logger.query(
      {
        limit: 400,
        start: 0,
        order: "asc"
      },
      (err, results) => {
        try {
          if (err) {
            reject(new Error(`Failed to read log: ${err}`));
          } else {
            resolve(
              results.file
                .map(({ level, message }) => `${level}: ${message}`)
                .join("\n")
            );
          }
        } catch (err) {
          reject(new Error(`Failed to read log: ${err}`));
        }
      }
    );
  });
}

/**
 * Paste content to paste.ubuntu.com
 * @async
 * @param {String} content - content to paste
 * @param {String} [poster] - user name
 * @param {String} [syntax] - syntax for highlighting
 * @param {String} [expiration] - how long to store the log
 * @returns {String} paste url
 * @throws if paste failed
 */
async function paste(
  content,
  poster = "UBports Installer",
  syntax = "text",
  expiration = "year"
) {
  const form = new FormData();
  form.append("poster", poster);
  form.append("syntax", syntax);
  form.append("expiration", expiration);
  form.append("content", content);

  return axios
    .post("http://paste.ubuntu.com", form, { headers: form.getHeaders() })
    .then(r => `https://paste.ubuntu.com/${r.request.path}`)
    .catch(error => {
      throw new Error(`Failed to paste: ${error}`);
    });
}

// setTimeout(async () => {
//   console.log(await sendBugReport());
// }, 5000);

async function sendBugReport(reason) {
  const log = await getLog();
  const [pasteUrl, runUrl] = await Promise.all([
    // paste(log),
    Promise.resolve("TODO uncomment for paste url"),
    sendOpenCutsRun("FAIL", log)
  ]);
  return { pasteUrl, runUrl };
}

function createBugReport(title, callback) {
  var options = {
    limit: 400,
    start: 0,
    order: "desc"
  };

  global.logger.query(options, function(err, results) {
    if (err) {
      throw err;
    }

    var errorLog = "";
    results.file.forEach(err => {
      errorLog += err.level + ": ";
      errorLog += err.message + "\n";
    });

    const form = new FormData();
    form.append("poster", "UBports Installer");
    form.append("syntax", "text");
    form.append("expiration", "year");
    form.append("content", `Title: ${title}\n\n${errorLog}`);

    Promise.all([
      axios
        .post("http://paste.ubuntu.com", form, { headers: form.getHeaders() })
        .then(r => `https://paste.ubuntu.com/${r.request.path}`)
        .catch(() => false),
      createOpenCutsRun("FAIL", errorLog).catch(() => false)
    ])
      .then(res =>
        osInfo(hostOs => callback(getDebugInfo(title, res[0], res[1], hostOs)))
      )
      .catch(() => callback(false));
  });
}

function getOpenCutsComment(hostOs) {
  return (
    "This run was automatically posted by the UBports Installer." +
    (global.installProperties.device
      ? ` Device: ${global.installProperties.device}`
      : "") +
    ` OS to install: ${getTargetOsString()}` +
    ` NodeJS version: ${process.version}`
  );
}

/**
 * OPEN-CUTS operating system mapping
 */
const OPENCUTS_OS = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows"
};

/**
 * Send an OPEN-CUTS run
 * @param {String} result - PASS WONKY FAIL
 * @param {String} [log] - log file contents
 * @returns {String} run url
 * @throws if sending run failed
 */
async function sendOpenCutsRun(result = "PASS", log) {
  const openCutsApi = new GraphQLClient("http://localhost:4001/graphql", {
    headers: process.env.OPENCUTS_API_KEY
      ? {
          authorization: process.env.OPENCUTS_API_KEY
        }
      : {}
  });
  return openCutsApi
    .request(
      gql`
        mutation smartRun(
          $testId: ID!
          $systemId: ID!
          $tag: String!
          $run: RunInput!
        ) {
          smartRun(testId: $testId, systemId: $systemId, tag: $tag, run: $run) {
            id
          }
        }
      `,
      {
        testId: "5e9d75406346e112514cfeca",
        systemId: "5e9d746c6346e112514cfec7",
        tag: global.packageInfo.version,
        run: {
          result: result,
          comment: "this is a comment",
          combination: [
            {
              variable: "Environment",
              value: OPENCUTS_OS[process.platform]
            },
            {
              variable: "Package",
              value: global.packageInfo.package || "source"
            }
          ],
          logs: [
            {
              name: "ubports-installer.log",
              content: log || (await getLog())
            }
          ]
        }
      }
    )
    .then(({ smartRun }) => `http://localhost:8080/run/${smartRun.id}`)
    .catch(error => {
      throw new Error(`Failed to create run: ${error}`);
    });
}

module.exports = {
  createBugReport,
  sendOpenCutsRun
};
