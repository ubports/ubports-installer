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
const cli = require("./cli.js");
const errors = require("./errors.js");
const core = require("../core/core.js");
const { prompt } = require("./prompt.js");

/**
 * operating system mapping
 * @private
 */
const OS_MAPPING = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows"
};

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
   * @param {String} logUrl - pastbin URL
   * @returns {String} url-encoded string to create a GitHub issue
   */
  async getDebugInfo(data, logfile) {
    return [
      `<!-- Please do not edit any of the following, you can add a description further down. -->\n`,
      `**UBports Installer \`${packageInfo.version}\` (${data.package})**\n`,
      `- Environment`,
      `\t- \`${data.environment}\``,
      `- Device`,
      `\t- ${this.getDeviceLinkMarkdown(data.device)}`,
      `- Target OS`,
      `\t- \`${core?.props?.os?.name}\``,
      `\n### Settings`,
      `\`\`\`\n${JSON.stringify(core?.props?.settings || {})}\n\`\`\``,
      `\n### Log`,
      `\`\`\`\n${logfile}\n\`\`\``,
      ...(data.error && data.error !== "Unknown Error"
        ? ["**Error:**", "```", data.error, "```"]
        : []),
      ...(errors.errors?.length
        ? [
            "\n**Previous Errors:**\n```",
            errors.errors.join("\n```\n```\n"),
            "```"
          ]
        : []),
      `\n### Description\n`,
      `<!-- Type any additional information below. -->`,
      `<!-- Thank you for reporting! -->\n`
    ]
      .filter(i => i)
      .join("\n");
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
   * Prepare form for an error report
   * @param {String} result pre-defined result
   * @param {String} error error message
   * @returns {Promise<Object>} error report form
   */
  async prepareErrorReport(result = "FAIL", error = "Unknown Error") {
    return {
      title: "Report an Error",
      description: `Sorry to hear that the installer did not work for you. You can help the UBports community fix this issue by reporting your installation result. Edit the information below and click Next to generate content for an issue report.`,
      dismissable: true,
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
          value: OS_MAPPING[process.platform],
          required: true
        },
        {
          var: "environment",
          name: "Environment",
          type: "text",
          placeholder: "Where are you running the installer?",
          value: await this.getEnvironment(),
          required: true
        }
      ],
      confirm: "Next",
      extraData: { result, error }
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
            this.sendBugReport(data);
          }
        })
        .catch(e => log.warn(`failed to report: ${e}`));
    }
  }

  /**
   * Open a new GitHub issue in the default browser
   * @async
   * @param {String} data - form data
   */
  async sendBugReport(data) {
    const logfile = await log.get();
    const body = await this.getDebugInfo(data, logfile);

    return prompt({
      title: "Report information",
      description: `Please copy the below text, press "Create Issue" and paste the copied text into the issue form.`,
      dismissable: true,
      fields: [
        {
          var: "content",
          name: "Content",
          type: "content",
          required: true,
          placeholder:
            "Please paste my content into the issue tracker, while the content is still there :-)",
          value: body
        }
      ],
      confirm: "Create Issue",
      extraData: { body }
    })
      .then(_ => {
        let issueUrl =
          "https://github.com/ubports/ubports-installer/issues/new";
        if (data) {
          issueUrl += `?title=${encodeURIComponent(data.title)}`;
        }
        shell.openExternal(issueUrl);
      })
      .catch(() => null);
  }
}

module.exports = new Reporter();
