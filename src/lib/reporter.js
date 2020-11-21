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
const packageInfo = require("../../package.json");
const { osInfo } = require("systeminformation");
const { path: cachePath } = require("./cache.js");
const log = require("./log.js");
const { OpenCutsReporter } = require("open-cuts-reporter");
const { paste } = require("ubuntu-pastebin");
const prompt = require("electron-dynamic-prompt");
const settings = require("./settings.js");

/**
 * OPEN-CUTS operating system mapping
 * @private
 */
const OPENCUTS_OS = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows"
};

/**
 * report errors or successes
 */
class Reporter {
  /**
   * Get device string
   * @returns {String} codename of the device to install or a string indicating its absence
   */
  getDeviceString() {
    try {
      return global.installProperties && global.installProperties.device
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
  getTargetOsString() {
    try {
      return global.installProperties.osIndex === undefined
        ? global.installConfig.operating_systems[
            global.installProperties.osIndex
          ].name
        : "(target os not yet set)";
    } catch (e) {
      return "unknown";
    }
  }

  /**
   * Get settings string
   * @returns {String} install settings string or a string indicating its absence
   */
  getSettingsString() {
    try {
      `\`${JSON.stringify(global.installProperties.settings || {})}\``;
    } catch (e) {
      return "unknown";
    }
  }

  /**
   * Get information about the os the installer is running on
   * @async
   * @returns {String} environment information
   */
  async getEnvironment() {
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
  async getDebugInfo(data, logUrl, runUrl) {
    return encodeURIComponent(
      [
        `**UBports Installer \`${packageInfo.version}\` (${data.package})**`,
        `Environment: \`${data.environment}\``,
        `Device: ${data.device}`,
        `Target OS: ${this.getTargetOsString()}`,
        `Settings: \`${this.getSettingsString()}\``,
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
   * Ensure a usable issue title
   * @param {String} error - error message or falsy value
   * @returns {String} issue title
   */
  getIssueTitle(error) {
    if (!error) return "";
    else return error.replaceAll(cachePath, "$CACHE");
  }

  /**
   * Open a new GitHub issue in the default browser
   * @async
   * @param {String} data - form data
   * @param {String} token - OPEN-CUTS API token
   */
  async sendBugReport(data, token) {
    const logfile = await log.get();
    const pasteUrl = paste(logfile, "UBports Installer", "text", "year").catch(
      () => "*N/A*"
    );
    const runUrl = this.sendOpenCutsRun(token, data, logfile).catch(
      () => "*N/A*"
    );
    shell.openExternal(
      `https://github.com/ubports/ubports-installer/issues/new?title=${encodeURIComponent(
        data.title
      )}&body=${await this.getDebugInfo(data, await pasteUrl, await runUrl)}`
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
   * @param {String} result pre-defined result
   * @returns {Array<Object>} generic form fields
   */
  genericFormFields(result) {
    return [
      {
        id: "device",
        label: "Device",
        type: "input",
        attrs: {
          placeholder: "Device codename",
          value: this.getDeviceString(),
          required: true
        }
      },
      {
        id: "package",
        label: "Package",
        type: "input",
        attrs: {
          placeholder: "What package of the Installer are you using?",
          value: packageInfo.package || "source",
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

  /**
   * Prepare form for an error report
   * @param {String} result pre-defined result
   * @param {String} errorMessage error message
   * @returns {Promise<Object>} error report form
   */
  async prepareErrorReport(result = "FAIL", errorMessage) {
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
            value: this.getIssueTitle(errorMessage)
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
        ...this.genericFormFields(result),
        {
          id: "environment",
          label: "Environment",
          type: "input",
          attrs: {
            placeholder: "Where are you running the installer?",
            value: await this.getEnvironment(),
            required: true
          }
        }
      ]
    };
  }

  /**
   * Prepare form for a success report
   * @returns {Promise<Object>} success report form
   */
  async prepareSuccessReport() {
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
            value: `Installed ${this.getTargetOsString()} on ${this.getDeviceString()} from a computer running ${await this.getEnvironment()}.`,
            required: true
          }
        },
        ...this.genericFormFields("PASS")
      ]
    };
  }

  /**
   * Prepare and send a report
   * @param {String} result PASS, WONKY, FAIL
   * @param {String} error error message or object
   * @param {BrowserWindow} mainWindow electron window
   */
  async report(result, error, mainWindow) {
    if (result !== "PASS") {
      return prompt(await this.prepareErrorReport(result, error), mainWindow)
        .then(data => {
          if (data) {
            this.sendBugReport(data, settings.get("opencuts_token"));
          }
        })
        .catch(e => log.warn(`failed to report: ${e}`));
    } else {
      return prompt(await this.prepareSuccessReport(), mainWindow)
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
   * @param {BrowserWindow} mainWindow electron window
   */
  tokenDialog(mainWindow) {
    return prompt(
      {
        title: "OPEN-CUTS API Token",
        height: 300,
        resizable: true,
        description:
          "You can set an API token for UBports' open crowdsourced user testing suite. If the token is set, automatic reports will be linked to your OPEN-CUTS account.",
        fields: [
          {
            id: "token",
            label: "Token",
            type: "input",
            attrs: {
              type: "password",
              value: settings.get("opencuts_token"),
              placeholder: "get your token on ubports.open-cuts.org",
              required: true
            }
          }
        ]
      },
      mainWindow
    )
      .then(({ token }) => {
        if (token) {
          settings.set("opencuts_token", token.trim());
        }
      })
      .catch(() => null);
  }
}

module.exports = new Reporter();
