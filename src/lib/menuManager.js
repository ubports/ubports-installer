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

const packageInfo = require("../../package.json");
const { BrowserWindow, shell, Menu } = require("electron");
const window = require("./window.js");
const udev = require("./udev.js");
const settings = require("./settings.js");
const cache = require("./cache.js");
const reporter = require("./reporter.js");
const branding = require("../../branding.json");

class MenuManager {
  /**
   * build global application menu
   * @param {BrowserWindow} mainWindow main UBports Installer window
   */
  getMenuTemplate(mainWindow) {
    return [
      {
        label: "About",
        submenu: [
          {
            label: `About ${branding["organisation-name"]}...`,
            visible: !!branding["organisation-url"],
            click: () => shell.openExternal(branding["organisation-url"])
          },
          {
            label: `About ${branding.os}...`,
            visible: !!branding["info-url"],
            click: () => shell.openExternal(branding["info-url"])
          },
          {
            label: "Donate",
            visible: !!branding["donate-url"],
            click: () => shell.openExternal(branding["donate-url"])
          },
          {
            label: "Source",
            visible: !!branding["installer-source"],
            click: () =>
              shell.openExternal(
                branding["installer-source"] +
                  packageInfo.version
              )
          },
          {
            label: "License",
            click: () =>
              shell.openExternal(
                branding["licence-url"] +
                  packageInfo.version +
                  "/LICENSE"
              )
          }
        ]
      },
      {
        label: "Window",
        role: "window",
        submenu: [
          {
            label: "Minimize",
            accelerator: "CmdOrCtrl+M",
            role: "minimize"
          },
          {
            label: "Close",
            accelerator: "CmdOrCtrl+W",
            role: "close"
          },
          {
            label: "Quit",
            accelerator: "CmdOrCtrl+Q",
            role: "close"
          }
        ]
      },
      {
        label: "Tools",
        submenu: [
          {
            label: "Set udev rules",
            click: udev.set,
            visible:
              packageInfo.package !== "snap" && process.platform === "linux"
          },
          {
            label: "Report a bug",
            visible: branding["allow-reporting"],
            click: () => window.send("user:report")
          },
          {
            label: "Developer tools",
            click: () => mainWindow.webContents.openDevTools()
          },
          {
            label: "Clean cached files",
            click: () => cache.clean()
          },
          {
            label: "Open settings config file",
            click: () => {
              settings.openInEditor();
            },
            visible: settings.size
          },
          {
            label: "Reset settings",
            click: () => {
              settings.clear();
            },
            visible: settings.size
          }
        ]
      },
      {
        label: "Settings",
        submenu: [
          {
            label: "Animations",
            checked: settings.get("animations"),
            type: "checkbox",
            click: () => {
              settings.set("animations", !settings.get("animations"));
              window.send("settings:animations", settings.get("animations"));
            }
          },
          {
            label: "Show hidden System-Image Channels",
            checked: settings.get("systemimage.showHiddenChannels"),
            type: "checkbox",
            click: () =>
              settings.set(
                "systemimage.showHiddenChannels",
                !settings.get("systemimage.showHiddenChannels")
              )
          },
          {
            label: "Never ask for udev rules",
            checked: settings.get("never.udev"),
            visible:
              packageInfo.package !== "snap" && process.platform === "linux",
            type: "checkbox",
            click: () => settings.set("never.udev", !settings.get("never.udev"))
          },
          {
            label: "Never ask for windows drivers",
            checked: settings.get("never.windowsDrivers"),
            visible: process.platform === "win32",
            type: "checkbox",
            click: () =>
              settings.set(
                "never.windowsDrivers",
                !settings.get("never.windowsDrivers")
              )
          },
          {
            label: "Never ask for OPEN-CUTS automatic reporting",
            visible: branding["allow-reporting"],
            checked: settings.get("never.opencuts"),
            type: "checkbox",
            click: () =>
              settings.set("never.opencuts", !settings.get("never.opencuts"))
          },
          {
            label: "OPEN-CUTS API Token",
            visible: branding["allow-reporting"],
            click: () => reporter.tokenDialog(mainWindow)
          }
        ]
      },
      {
        label: "Help",
        submenu: [
          {
            label: "Bug tracker",
            visible: !!branding["bug-tracker"],
            click: () =>
              shell.openExternal(
                branding["bug-tracker"]
              )
          },
          {
            label: "Report a bug",
            visible: branding["allow-reporting"],
            click: () => window.send("user:report")
          },
          {
            label: "Troubleshooting",
            visible: !!branding["troubleshooting"],
            click: () =>
              shell.openExternal(
                branding["troubleshooting"]
              )
          },
          {
            label: branding["forum-name"],
            visible: !!branding["forum-url"],
            click: () => shell.openExternal(branding["forum-url"])
          },
          {
            label: branding["support-name"],
            visible: !!branding["support-url"],
            click: () =>
              shell.openExternal(
                branding["support-url"]
              )
          },
          {
           label: branding["contact-name"],
           visible: !!branding["contact-url"],
           click: () => shell.openExternal(
             branding["contact-url"]
           )
          }
        ]
      }
    ];
  }

  /**
   * set global application menu
   * @param {BrowserWindow} mainWindow main UBports Installer window
   */
  setMenu(mainWindow) {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(this.getMenuTemplate(mainWindow))
    );
  }
}

module.exports = new MenuManager();
