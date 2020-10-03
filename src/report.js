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

const { shell } = require("electron");
const axios = require("axios");
const FormData = require("form-data");
const util = require("util");
const { osInfo } = require("systeminformation");
const { GraphQLClient, gql } = require("graphql-request");
require("cross-fetch/polyfill");

/**
 * Get device string
 * @returns {String} codename of the device to install or a string indicating its absence
 */
function getDeviceString() {
  try {
    return global.installProperties.device
      ? `${global.installProperties.device}`
      : "(device not yet detected)";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Get target os string
 * @returns {String} codename of the os to install or a string indicating its absence
 */
function getTargetOsString() {
  try {
    return !util.isUndefined(global.installProperties.osIndex)
      ? global.installConfig.operating_systems[global.installProperties.osIndex]
          .name
      : "(target os not yet set)";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Get settings string
 * @returns {String} install settings string or a string indicating its absence
 */
function getSettingsString() {
  try {
    `\`${JSON.stringify(global.installProperties.settings || {})}\``;
  } catch (e) {
    return "unknown";
  }
}

/**
 * Get package string
 * @returns {String} snap, deb, AppImage, exe, dmg, source, or unknown
 */
function getPackageString() {
  try {
    return process.env.SNAP_NAME
      ? "snap"
      : global.packageInfo.package || "source";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Get information about the os the installer is running on
 * @async
 * @returns {String} environment information
 */
async function getHostOsString() {
  return new Promise(function(resolve, reject) {
    try {
      osInfo(hostOs =>
        resolve(
          [
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
            .join(" ")
        )
      );
    } catch (error) {
      return process.platform;
    }
  });
}

/**
 * Generate a URL-encoded string to create a GitHub issue
 * @async
 * @param {Error} reason - pass an error for an error report, a falsy value for a user-requested report
 * @param {String} logUrl - Ubuntu pastebin URL
 * @param {String} runUrl - OPEN-CUTS run URL
 * @returns {String} url-encoded string to create a GitHub issue
 */
async function getDebugInfo(reason, logUrl, runUrl) {
  return encodeURIComponent(
    [
      `**UBports Installer \`${
        global.packageInfo.version
      }\` (${getPackageString()})**`,
      `Environment: \`${await getHostOsString()}\` with Node.js \`${
        process.version
      }\``,
      `Device: ${getDeviceString()}`,
      `Target OS: ${getTargetOsString()}`,
      `Settings: \`${getSettingsString()}\``,
      `OPEN-CUTS run: ${runUrl}`,
      `Log: ${logUrl}`,
      "\n",
      ...(reason
        ? ["**Error:**", "```", reason, "```"]
        : ["<!-- please describe how to reproduce this issue -->\n"])
    ]
      .filter(i => i)
      .join("\n")
  );
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

/**
 * Ensure a usable issue title
 * @param {String} reason - error message or falsy value
 * @returns {String} issue title
 */
function getIssueTitle(reason) {
  if (!reason) {
    return encodeURIComponent("please describe the problem in a few words");
  } else if (reason.length > 200) {
    return encodeURIComponent(
      `${reason.slice(0, 75)} [...] ${reason.slice(reason.length - 100)}`
    );
  } else {
    return encodeURIComponent(reason);
  }
}

/**
 * Open a new GitHub issue in the default browser
 * @async
 * @param {String} reason - error message or falsy value
 */
async function sendBugReport(reason) {
  const log = await getLog();
  const [pasteUrl, runUrl] = await Promise.all([
    paste(log),
    sendOpenCutsRun(reason ? "FAIL" : "WONKY", log)
  ]);
  shell.openExternal(
    `https://github.com/ubports/ubports-installer/issues/new?title=${getIssueTitle(
      reason
    )}&body=${await getDebugInfo(reason, pasteUrl, runUrl)}`
  );
  return;
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
 * @async
 * @param {String} result - PASS WONKY FAIL
 * @param {String} [log] - log file contents
 * @returns {String} run url
 * @throws if sending run failed
 */
async function sendOpenCutsRun(result = "PASS", log) {
  const openCutsApi = new GraphQLClient(
    "https://ubports.open-cuts.org/graphql",
    {
      headers: process.env.OPENCUTS_API_KEY
        ? {
            authorization: process.env.OPENCUTS_API_KEY
          }
        : {}
    }
  );
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
          comment: `Installed ${getTargetOsString()} on ${getDeviceString()} from a computer running ${await getHostOsString()}.`,
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
    .then(({ smartRun }) => `https://ubports.open-cuts.org/run/${smartRun.id}`)
    .catch(error => {
      throw new Error(`Failed to create run: ${error}`);
    });
}

module.exports = {
  sendBugReport,
  sendOpenCutsRun
};
