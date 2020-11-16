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

/**
 * manage udev rules
 */
class Udev {
  /**
   * obtain superuser rights and set udev rules
   */
  set() {
    sudo.exec(
      "cp " +
        path.join(__dirname, "../build/10-ubports.rules") +
        " /etc/udev/rules.d/ && " +
        '(udevadm control --reload-rules || echo "") && ' +
        '(udevadm trigger || echo "") && ' +
        '(service udev restart || echo "")',
      {
        name: "UBports Installer",
        icns: path.join(__dirname, "../build/icons/icon.icns")
      },
      error => {
        if (error) log.warn(`setting udev rules failed: ${error}`);
        else log.debug("udev rules set");
      }
    );
  }
}

module.exports = new Udev();
