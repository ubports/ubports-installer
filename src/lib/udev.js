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

const sudo = require("sudo-prompt");
const path = require("path");
const log = require("./log.js");
const { ipcMain } = require("electron");
const branding = require("../../branding.json");

const vendorIds = [
  "03f0",
  "03fc",
  "0408",
  "0409",
  "0414",
  "0451",
  "0471",
  "0482",
  "0489",
  "04b7",
  "04c5",
  "04da",
  "04dd",
  "04e8",
  "0502",
  "0531",
  "054c",
  "05c6",
  "067e",
  "091e",
  "0930",
  "0955",
  "0b05",
  "0bb4",
  "0c2e",
  "0db0",
  "0e79",
  "0e8d",
  "0f1c",
  "0fce",
  "1004",
  "109b",
  "10a9",
  "1219",
  "12d1",
  "1662",
  "16d5",
  "17ef",
  "18d1",
  "1949",
  "19a5",
  "19d2",
  "1b8e",
  "1bbb",
  "1d09",
  "1d45",
  "1d4d",
  "1d91",
  "1e85",
  "1ebf",
  "1f3a",
  "1f53",
  "2006",
  "201e",
  "2080",
  "2116",
  "2207",
  "2237",
  "2257",
  "22b8",
  "22d9",
  "2314",
  "2340",
  "2420",
  "24e3",
  "25e3",
  "2717",
  "271d",
  "2836",
  "2916",
  "297f",
  "29a9",
  "29e4",
  "2a45",
  "2a47",
  "2a49",
  "2a70",
  "2ae5",
  "413c",
  "8087",
  "e040"
];

const rules = vendorIds
  .map(id => `SUBSYSTEM=="usb", ATTR{idVendor}=="${id}", MODE="0666"`)
  .join("\n");

const udevCommand = [
  `echo '${rules}' > /etc/udev/rules.d/10-ubports.rules`,
  "(udevadm control --reload-rules || true)",
  "(udevadm trigger || true)",
  "(service udev restart || true)"
].join(" && ");

/**
 * manage udev rules
 */
class Udev {
  /**
   * obtain superuser rights and set udev rules
   */
  set() {
    sudo.exec(
      udevCommand,
      {
        name: branding.appname,
        icns: path.join(__dirname, "../../build/icons/icon.icns")
      },
      error => {
        if (error) log.warn(`setting udev rules failed: ${error}`);
        else log.debug("udev rules set");
      }
    );
  }
}

const udev = new Udev();

// The user requested udev rules to be set
ipcMain.on("udev", udev.set);

module.exports = udev;
