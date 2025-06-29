"use strict";

/*
 * Copyright (C) 2017-2022 UBports Foundation <info@ubports.com>
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

const { shell, Menu } = require("electron");
const packageInfo = require("../../package.json");
const window = require("./window.js");
const udev = require("./udev.js");
const settings = require("./settings.js");
const cache = require("./cache.js");
const mainEvent = require("./mainEvent.js");

class MenuManager {
  /**
   * build global application menu
   */
  getMenuTemplate() {
    const isMac = process.platform === "darwin";

    return [
      // { role: 'appMenu' }
      ...(isMac
        ? [
            {
              label: "UBports Installer (" + packageInfo.version + ")",
              role: "appMenu",
              submenu: [
                { role: "about" },
                { type: "separator" },
                { role: "services" },
                { type: "separator" },
                { role: "hide" },
                { role: "hideOthers" },
                { role: "unhide" },
                { type: "separator" },
                { role: "quit" }
              ]
            }
          ]
        : []),
      // { role: 'fileMenu' }
      {
        label: "File",
        role: "fileMenu",
        submenu: [
          {
            label: "Restart UBports Installer",
            click: () => {
              mainEvent.emit("restart");
            }
          },
          { type: "separator" },
          isMac ? { role: "close" } : { role: "quit" }
        ]
      },
      // { role: 'viewMenu' }
      {
        label: "View",
        role: "viewMenu",
        submenu: [
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      // { role: 'windowMenu' }
      {
        label: "Window",
        role: "windowMenu",
        submenu: [
          { role: "minimize" },
          { role: "zoom" },
          ...(isMac
            ? [
                { type: "separator" },
                { role: "front" },
                { type: "separator" },
                { role: "window" }
              ]
            : [{ role: "close" }])
        ]
      },
      // { role: 'toolsMenu' }
      {
        label: "Tools",
        role: "toolsMenu",
        submenu: [
          {
            label: "Set udev rules",
            click: udev.set,
            visible:
              packageInfo.package !== "snap" && process.platform === "linux"
          },
          {
            label: "Clean cached files",
            click: () => cache.clean()
          }
        ]
      },
      // { role: 'settingsMenu' }
      {
        label: "Settings",
        role: "settingsMenu",
        submenu: [
          {
            label: "Disable animations",
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
            label: "Never ask for installation result reporting",
            checked: settings.get("never.reportInstallationResult"),
            type: "checkbox",
            click: () =>
              settings.set(
                "never.reportInstallationResult",
                !settings.get("never.reportInstallationResult")
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
          { type: "separator" },
          {
            label: "Open settings config file",
            click: () => {
              if (!settings.size) settings.clear();
              settings.openInEditor();
            }
          },
          {
            label: "Reset settings",
            click: () => {
              settings.clear();
            }
          }
        ]
      },
      // { role: 'help' }
      {
        label: "Help",
        role: "help",
        submenu: [
          {
            label: "Troubleshooting",
            click: () =>
              shell.openExternal(
                "https://docs.ubports.com/en/latest/userguide/install.html#troubleshooting"
              )
          },
          { type: "separator" },
          {
            label: "Bug tracker",
            click: () =>
              shell.openExternal(
                "https://github.com/ubports/ubports-installer/issues"
              )
          },
          {
            label: "Report a bug",
            click: () => window.send("user:report")
          },
          { type: "separator" },
          {
            label: "UBports Forums",
            click: () => shell.openExternal("https://forums.ubports.com")
          },
          {
            label: "AskUbuntu",
            click: () =>
              shell.openExternal(
                "https://askubuntu.com/questions/tagged/ubuntu-touch"
              )
          },
          {
            label: "Telegram",
            click: () => shell.openExternal("https://t.me/WelcomePlus")
          }
        ]
      },
      // { role: 'aboutMenu' }
      {
        label: "About",
        role: "aboutMenu",
        submenu: [
          {
            label: "Donate",
            click: () => shell.openExternal("https://ubports.com/donate")
          },
          {
            label: "Source",
            click: () =>
              shell.openExternal(
                "https://github.com/ubports/ubports-installer/tree/" +
                  packageInfo.version
              )
          },
          {
            label: "License",
            click: () =>
              shell.openExternal(
                "https://github.com/ubports/ubports-installer/blob/" +
                  packageInfo.version +
                  "/LICENSE"
              )
          },
          { type: "separator" },
          {
            label: "About the UBports Foundation...",
            click: () => shell.openExternal("https://ubports.com")
          },
          {
            label: "About Ubuntu Touch...",
            click: () => shell.openExternal("https://ubuntu-touch.io")
          }
        ]
      }
    ];
  }

  /**
   * set global application menu
   */
  setMenu() {
    Menu.setApplicationMenu(Menu.buildFromTemplate(this.getMenuTemplate()));
  }
}

module.exports = new MenuManager();
