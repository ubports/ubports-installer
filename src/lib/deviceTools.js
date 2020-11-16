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

const { DeviceTools } = require("./asarLibs.js");
const log = require("./log.js");

/**
 * adb, fastboot, and heimdall
 * @extends DeviceTools
 */
class DeviceToolsWithListeners extends DeviceTools {
  constructor() {
    super();
    ["exec", "spawn:start", "spawn:exit", "spawn:error"].forEach(event =>
      this.on(event, r => log.command(`${event}: ${JSON.stringify(r)}`))
    );
  }
}

module.exports = new DeviceToolsWithListeners();
