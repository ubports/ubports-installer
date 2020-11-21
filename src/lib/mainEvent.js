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

const log = require("./log.js");
const { ipcMain } = require("electron");
const EventEmitter = require("events");

const mainEvent = new EventEmitter();

// Restart the installer
ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});

// The user selected a device
ipcMain.on("device:selected", (event, device) => {
  log.info("device selected: " + device);
  mainEvent.emit("device", device);
});

// Error from the renderer process
ipcMain.on("renderer:error", (event, error) => {
  mainEvent.emit("user:error", error);
});

// The user selected a device
mainEvent.on("device:detected", device => {
  log.info("device detected: " + device);
  mainEvent.emit("device", device);
});

module.exports = mainEvent;
