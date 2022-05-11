"use strict";

/*
 * Copyright (C) 2020-2022 UBports Foundation <info@ubports.com>
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
const packageInfo = require("../../package.json");
const { osInfo } = require("systeminformation");
const { path: cachePath } = require("./cache.js");
const log = require("./log.js");
const { OpenCutsReporter } = require("open-cuts-reporter");
const settings = require("./settings.js");
const cli = require("./cli.js");
const core = require("../core/core.js");
const { prompt } = require("./prompt.js");
const { paste } = require("./paste.js");
const branding = require("../../branding.json");

/**
 * OPEN-CUTS operating system mapping
 * @private
 */
const OPENCUTS_OS = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows"
};

const MISSING_LOG =
  "*N/A* <!-- Uploading logs failed. Please add them manually: https://github.com/ubports/ubports-installer#logs -->";

/**
 * report errors or successes
 */
class Reporter {
  /**
   * Get information about the os the installer is running on
   * @async
   * @returns {String} environment information
   */
  async getEnvironment() {
    return osInfo()
      .then(r =>
        [
          r.distro,
          r.release,
          r.codename,
          r.platform,
          r.kernel,
          r.arch,
          r.build,
          r.servicepack,
          `NodeJS ${process.version}`
        ]
          .filter(i => i)
          .join(" ")
      )
      .catch(() => process.platform);
  }

  /**
   * get device link markdown from codename
   * @param {String} codename device codename, not necessarily canonical
   * @returns {String} device link markdown
   */
  getDeviceLinkMarkdown(codename) {
    return (
      ((core?.props?.config?.codename &&
        `[\`${
          core?.props?.config?.codename
        }\`](https://github.com/ubports/installer-configs/blob/${
          core?.props?.config?.sha || "master"
        }/v2/devices/${core?.props?.config?.codename}.yml)` +
          ((core?.props?.config?.name &&
            core?.props?.os?.name === "Ubuntu Touch" &&
            ` ([${core?.props?.config?.name}](https://devices.ubuntu-touch.io/device/${core?.props?.config?.codename}/))`) ||
            ` (${core?.props?.config?.name})`)) ||
        (codename && `\`${codename}\``) ||
        "(not device dependent)") + (cli.file ? " with local config file" : "")
    );
  }

  /**
   * Generate a URL-encoded string to create a GitHub issue
   * @async
   * @param {Object} data - form data
   * @param {String} runUrl - OPEN-CUTS run URL
   * @param {String} logUrl - pastbin URL
   * @returns {String} url-encoded string to create a GitHub issue
   */
  async getDebugInfo(data, runUrl, logUrl) {
    return encodeURIComponent(
      [
        `**${branding.appname} \`${packageInfo.version}\` (${data.package})**`,
        `Environment: \`${data.environment}\``,
        `Device: ${this.getDeviceLinkMarkdown(data.device)}`,
        `Target OS: ${core?.props?.os?.name}`,
        `Settings: \`${JSON.stringify(core?.props?.settings || {})}\``,
        `OPEN-CUTS run: ${runUrl || MISSING_LOG}`,
        `Pastebin: ${logUrl || MISSING_LOG}`,
        data.comment && `\n${data.comment?.trim()}\n`,
        ...(data.error && data.error !== "Unknown Error"
          ? ["**Error:**", "```", data.error, "```"]
          : []),
        "<!-- thank you for reporting! -->\n"
      ]
        .filter(i => i)
        .join("\n")
    );
  }

  /**
   * Ensure a usable issue title
   * @param {String} error - error message or falsy value
   * @returns {String} issue title
   */
  getIssueTitle(error) {
    if (!error) return "";
    else return error.replace(new RegExp(cachePath, "g"), "$CACHE");
  }

  /**
   * Open a new GitHub issue in the default browser
   * @async
   * @param {String} data - form data
   * @param {String} token - OPEN-CUTS API token
   */
  async sendBugReport(data, token) {
    const logfile = await log.get();
    const runUrl = this.sendOpenCutsRun(token, data, logfile).catch(() => null);
    const logUrl = paste(logfile);
    shell.openExternal(
      `https://github.com/ubports/ubports-installer/issues/new?title=${encodeURIComponent(
        data.title
      )}&body=${await this.getDebugInfo(data, await runUrl, await logUrl)}`
    );
    return;
  }

  /**
   * Send an OPEN-CUTS run
   * @async
   * @param {String} [token] - OPEN-CUTS API token
   * @param {Object} data - form data
   * @param {Promise<String>} [logfile] - log file contents
   * @returns {String} run url
   * @throws if sending run failed
   */
  async sendOpenCutsRun(token, data, logfile = log.get()) {
    const openCutsApi = new OpenCutsReporter({
      url: "https://ubports.open-cuts.org",
      token
    });
    return openCutsApi.smartRun(
      "5e9d746c6346e112514cfec7",
      "5e9d75406346e112514cfeca",
      packageInfo.version,
      {
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
            content: await logfile
          }
        ]
      }
    );
  }

  /**
   * Get generic form fields
   * @returns {Array<Object>} generic form fields
   */
  genericFormFields() {
    return [
      {
        var: "device",
        name: "Device",
        type: "text",
        placeholder: "Device codename",
        value: core?.props?.config?.codename || "",
        required: true
      },
      {
        var: "package",
        name: "Package",
        type: "text",
        placeholder: "What package of the Installer are you using?",
        value: packageInfo.package || "source",
        required: true
      },
      {
        var: "hostOs",
        name: "Host OS",
        type: "text",
        placeholder: "What operating system are you using?",
        value: OPENCUTS_OS[process.platform],
        required: true
      }
    ];
  }

  /**
   * Prepare form for an error report
   * @param {String} result pre-defined result
   * @param {String} error error message
   * @returns {Promise<Object>} error report form
   */
  async prepareErrorReport(result = "FAIL", error = "Unknown Error") {
    return {
      title: "Report an Error",
      description: `Sorry to hear that the installer did not work for you. You can help the UBports community fix this issue by reporting your installation result. Edit the information below and click OK to submit. The installer will then automatically report a ${result} run to [ubports.open-cuts.org](https://ubports.open-cuts.org). After that, your webbrowser will open so you can create a bug report on GitHub.`,
      fields: [
        {
          var: "title",
          name: "Title",
          type: "text",
          required: true,
          placeholder: "Please summarize your experience in a few words",
          value: this.getIssueTitle(error)
        },
        {
          var: "comment",
          name: "Comment",
          type: "text",
          placeholder: "How can we reproduce this issue?",
          required: true
        },
        ...this.genericFormFields(result),
        {
          var: "environment",
          name: "Environment",
          type: "text",
          placeholder: "Where are you running the installer?",
          value: await this.getEnvironment(),
          required: true
        }
      ],
      confirm: "Send",
      extraData: { result, error }
    };
  }

  /**
   * Prepare form for a success report
   * @returns {Promise<Object>} success report form
   */
  async prepareSuccessReport() {
    return {
      title: "Report Success",
      description:
        "You can help the UBports community improve the installer by reporting your installation result. Edit the information below and click OK to automatically submit a run with an attached log to [ubports.open-cuts.org](https://ubports.open-cuts.org).",
      fields: [
        {
          var: "comment",
          name: "Comment",
          type: "text",
          placeholder: "You can provide detailed information here...",
          value: `Installed ${core?.props?.os?.name} on ${
            core?.props?.config?.codename
          } from a computer running ${await this.getEnvironment()}.`,
          required: true
        },
        ...this.genericFormFields()
      ],
      confirm: "Send",
      extraData: {
        result: "PASS"
      }
    };
  }

  /**
   * Prepare and send a report
   * @param {String} result PASS, WONKY, FAIL
   * @param {String} error error message or object
   */
  async report(result, error) {
    if (result !== "PASS") {
      return prompt(await this.prepareErrorReport(result, error))
        .then(data => {
          if (data) {
            this.sendBugReport(data, settings.get("opencuts_token"));
          }
        })
        .catch(e => log.warn(`failed to report: ${e}`));
    } else {
      return prompt(await this.prepareSuccessReport())
        .then(data => {
          if (data) {
            this.sendOpenCutsRun(settings.get("opencuts_token"), data).then(
              url => {
                log.info(
                  `Thank you for reporting! You can view your run here: ${url}`
                );
                shell.openExternal(url);
              }
            );
          }
        })
        .catch(e => log.warn(`failed to report: ${e}`));
    }
  }

  /**
   * Open a dialog to set the token
   */
  tokenDialog() {
    return prompt({
      title: "OPEN-CUTS API Token",
      description:
        "You can set an API token for UBports' open crowdsourced user testing suite. If the token is set, automatic reports will be linked to your [OPEN-CUTS account](https://ubports.open-cuts.org/account).",
      fields: [
        {
          var: "token",
          name: "Token",
          type: "password",
          value: settings.get("opencuts_token"),
          placeholder: "get your token on ubports.open-cuts.org",
          required: true,
          tooltip: "You can find this on your account page",
          link: "https://ubports.open-cuts.org/account"
        }
      ],
      confirm: "Set token"
    })
      .then(({ token }) => {
        if (token) {
          settings.set("opencuts_token", token.trim());
        }
      })
      .catch(() => null);
  }
}

module.exports = new Reporter();
