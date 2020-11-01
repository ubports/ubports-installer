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

const { shell } = require("electron");
const axios = require("axios");
const FormData = require("form-data");
const util = require("util");
const { osInfo } = require("systeminformation");
const { GraphQLClient, gql } = require("graphql-request");
const { getUbuntuTouchDir } = require("./utils");
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
    return global.packageInfo.package || "source";
  } catch (e) {
    return "unknown";
  }
}

/**
 * Get information about the os the installer is running on
 * @async
 * @returns {String} environment information
 */
async function getEnvironment() {
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
            hostOs.servicepack,
            `NodeJS ${process.version}`
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
 * @param {Object} data - form data
 * @param {String} logUrl - Ubuntu pastebin URL
 * @param {String} runUrl - OPEN-CUTS run URL
 * @returns {String} url-encoded string to create a GitHub issue
 */
async function getDebugInfo(data, logUrl, runUrl) {
  return encodeURIComponent(
    [
      `**UBports Installer \`${global.packageInfo.version}\` (${data.package})**`,
      `Environment: \`${data.environment}\``,
      `Device: ${data.device}`,
      `Target OS: ${getTargetOsString()}`,
      `Settings: \`${getSettingsString()}\``,
      `OPEN-CUTS run: ${runUrl}`,
      `Log: ${logUrl}`,
      "\n",
      data.comment,
      "\n",
      ...(data.error ? ["**Error:**", "```", data.error, "```"] : []),
      "<!-- thank you for reporting! -->\n"
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
 * @param {Promise<String>} content - content to paste
 * @param {String} [poster] - user name
 * @param {String} [syntax] - syntax for highlighting
 * @param {String} [expiration] - how long to store the log
 * @returns {String} paste url
 * @throws if paste failed
 */
async function paste(
  content = getLog(),
  poster = "UBports Installer",
  syntax = "text",
  expiration = "year"
) {
  const form = new FormData();
  form.append("poster", poster);
  form.append("syntax", syntax);
  form.append("expiration", expiration);
  form.append("content", await content);

  return axios
    .post("http://paste.ubuntu.com", form, { headers: form.getHeaders() })
    .then(r => {
      if (r.request.path && r.request.path.length >= 2) {
        return r.request.path;
      } else {
        throw new Error(
          `Failed to paste: Invalid path response: ${r.request.path}`
        );
      }
    })
    .then(pasteId => `https://paste.ubuntu.com${pasteId}`)
    .catch(error => {
      throw new Error(`Failed to paste: ${error}`);
    });
}

/**
 * Ensure a usable issue title
 * @param {String} error - error message or falsy value
 * @returns {String} issue title
 */
function getIssueTitle(error) {
  if (!error) return "";
  else return error.replaceAll(getUbuntuTouchDir(), "$CACHE");
}

/**
 * Open a new GitHub issue in the default browser
 * @async
 * @param {String} data - form data
 * @param {String} opencutsToken - OPEN-CUTS API token
 */
async function sendBugReport(data, opencutsToken) {
  const log = getLog();
  const pasteUrl = paste(log).catch(() => "*N/A*");
  const runUrl = sendOpenCutsRun(opencutsToken, data, log).catch(() => "*N/A*");
  shell.openExternal(
    `https://github.com/ubports/ubports-installer/issues/new?title=${encodeURIComponent(
      data.title
    )}&body=${await getDebugInfo(data, await pasteUrl, await runUrl)}`
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
 * @param {String} [token] - OPEN-CUTS API token
 * @param {Object} data - form data
 * @param {Promise<String>} [log] - log file contents
 * @returns {String} run url
 * @throws if sending run failed
 */
async function sendOpenCutsRun(token, data, log = getLog()) {
  const openCutsApi = new GraphQLClient(
    "https://ubports.open-cuts.org/graphql",
    { headers: token ? { authorization: token } : {} }
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
          result: data.result,
          comment: data.comment,
          combination: [
            {
              variable: "Environment",
              value: data.hostOs
            },
            {
              variable: "Package",
              value: data.package
            }
          ],
          logs: [
            {
              name: "ubports-installer.log",
              content: await log
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

function genericFormFields(result) {
  return [
    {
      id: "device",
      label: "Device",
      type: "input",
      attrs: {
        placeholder: "Device codename",
        value: global.installProperties.device || "N/A",
        required: true
      }
    },
    {
      id: "package",
      label: "Package",
      type: "input",
      attrs: {
        placeholder: "What package of the Installer are you using?",
        value: global.packageInfo.package || "source",
        required: true
      }
    },
    {
      id: "hostOs",
      label: "Host OS",
      type: "input",
      attrs: {
        placeholder: "What operating system are you using?",
        value: OPENCUTS_OS[process.platform],
        required: true
      }
    },
    {
      id: "result",
      label: "",
      type: "input",
      attrs: {
        placeholder: "PASS, WONKY, FAIL",
        value: result,
        style: "display: none;"
      }
    }
  ];
}

async function prepareErrorReport(result = "FAIL", errorMessage) {
  return {
    modal: false,
    title: "Report an Error",
    description: `Sorry to hear that the installer did not work for you. You can help the UBports community fix this issue by reporting your installation result. Edit the information below and click OK to submit. The installer will then automatically report a ${result} run to ubports.open-cuts.org and send a log to paste.ubuntu.com. After that, your webbrowser will open so you can create a bug report on GitHub.`,
    resizable: true,
    height: 720,
    width: 650,
    fields: [
      {
        id: "title",
        label: "Title",
        type: "input",
        attrs: {
          required: true,
          placeholder: "Please summarize your experience in a few words",
          value: getIssueTitle(errorMessage)
        }
      },
      {
        id: "error",
        label: "",
        type: "input",
        attrs: {
          placeholder: "Original error",
          value: errorMessage
        }
      },
      {
        id: "comment",
        label: "Comment",
        type: "input",
        attrs: {
          placeholder: "How can we reproduce this issue?",
          required: true
        }
      },
      ...genericFormFields(result),
      {
        id: "environment",
        label: "Environment",
        type: "input",
        attrs: {
          placeholder: "Where are you running the installer?",
          value: await getEnvironment(),
          required: true
        }
      }
    ]
  };
}

async function prepareSuccessReport() {
  return {
    modal: false,
    title: "Report Success",
    description:
      "You can help the UBports community improve the installer by reporting your installation result. Edit the information below and click OK to automatically submit a run with an attached log to ubports.open-cuts.org.",
    resizable: true,
    height: 720,
    width: 650,
    fields: [
      {
        id: "comment",
        label: "Comment",
        type: "input",
        attrs: {
          placeholder: "You can provide detailed information here...",
          value: `Installed ${getTargetOsString()} on ${getDeviceString()} from a computer running ${await getEnvironment()}.`,
          required: true
        }
      },
      ...genericFormFields("PASS")
    ]
  };
}

module.exports = {
  sendBugReport,
  sendOpenCutsRun,
  prepareSuccessReport,
  prepareErrorReport
};
