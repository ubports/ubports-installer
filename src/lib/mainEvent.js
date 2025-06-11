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
const settings = require("./settings.js");
const window = require("./window.js");
const { ipcMain, shell } = require("electron");
const EventEmitter = require("events");
const { prompt } = require("./prompt.js");
const packageInfo = require("../../package.json");

const mainEvent = new EventEmitter();

// Restart the installer
ipcMain.on("restart", () => {
  mainEvent.emit("restart");
});

// Error from the renderer process
ipcMain.on("renderer:error", (event, error) => {
  mainEvent.emit("user:error", error);
});

// Open the bugreporting tool
mainEvent.on("user:error", (error, restart, ignore) => {
  try {
    if (window.getMain()) {
      window.send("user:error", error);
      ipcMain.once("user:error:reply", (e, reply) => {
        switch (reply) {
          case "ignore":
            log.warn("error ignored");
            if (ignore) setTimeout(ignore, 500);
            return;
          case "restart":
            log.warn("restart after error");
            if (restart) setTimeout(restart, 500);
            else mainEvent.emit("restart");
            return;
          case "bugreport":
            return window.send("user:report");
          default:
            break;
        }
      });
    } else {
      process.exit(1);
    }
  } catch (e) {
    process.exit(1);
  }
});

// The device's bootloader is locked, prompt the user to unlock it
mainEvent.on("user:oem-lock", (enable = false, code_url, unlock) => {
  prompt({
    title: enable ? "Failed to unlock bootloader" : "Bootloader locked",
    description:
      (enable
        ? `Your device could not be unlocked. Please make sure OEM unlocking is enabled in the devices [developer options](https://www.thecustomdroid.com/enable-oem-unlocking-on-android/). After that, you can select the button below to continue the installation.`
        : `Your device's bootloader is locked, that means installation of third party operating systems like Ubuntu Touch is disabled.

**Removing this lock might void the warranty. If you want to be sure, please ask your manufacturer or vendor if they allow this. UBports is not responsible and won't replace devices in case of warranty loss. You are responsible for your own actions.**

Do you want to unlock your device now?

You might see a confirmation dialog on your device next.`) +
      (code_url
        ? `\n\nYou have to obtain an unlocking code from [your vendor](${code_url}). Please enter the code below and click the button to continue.`
        : ""),
    fields: code_url
      ? [
          {
            var: "code",
            name: "Code",
            type: "text",
            placeholder: "unlock code",
            link: code_url
          }
        ]
      : []
  }).then(({ code }) => {
    mainEvent.emit("user:write:working", "squares");
    mainEvent.emit("user:write:status", "Unlocking", true);
    mainEvent.emit(
      "user:write:under",
      "You might see a confirmation dialog on your device."
    );
    unlock(code);
  });
});

// update
mainEvent.on("user:update-available", (updateUrl, prerelease) => {
  log.warn(
    "Please update: " +
      (packageInfo.package === "snap"
        ? "snap refresh ubports-installer --stable"
        : updateUrl)
  );
  prompt({
    title: prerelease
      ? `Prerelease ${packageInfo.version}`
      : "Update available!",
    dismissable: true,
    description:
      "You are " +
      (prerelease ? "running a prerelease" : "not running the latest stable") +
      " version. Using the latest stable release is recommended for most users. You can still use this version, but there might be bugs and issues that do not affect the stable release.\n\n" +
      (packageInfo.package === "snap"
        ? "Run `snap refresh ubports-installer --stable` in your terminal to install the latest version"
        : `Please download the [latest version](${updateUrl})`) +
      (prerelease ? ", unless you know what you're doing." : "."),
    confirm: "Download"
  }).then(() => shell.openExternal(updateUrl));
});

// eula
mainEvent.on("user:eula", (eula, resolve) => {
  prompt({ ...eula, confirm: "I agree" }).then(resolve);
});

// unlock
mainEvent.on("user:unlock", (fields, resolve) => {
  prompt({
    title: "Unlock your device",
    description:
      "The following actions are required for the installer to work.",
    fields,
    confirm: "My device is unlocked"
  }).then(resolve);
});

// installer_version
mainEvent.on("user:installer_version", (version, resolve) => {
  log.warn(`Incompatible UBports Installer version! Required: ${version}`);
  prompt({
    title: "Incompatible installer version",
    dismissable: false,
    description: `This installation procedure requires UBports Installer \`${version}\`. You are running \`${packageInfo.version}\`. Please use a [compatible installer](https://github.com/ubports/ubports-installer/releases). You might also ignore this warning, but there is no guarantee the installer will work as expected.`,
    confirm: "I know what I'm doing, ignore warning and continue"
  }).then(() => resolve(log.warn("Installer version constraint ignored")));
});

// prerequisites
mainEvent.on("user:prerequisites", (fields, resolve) => {
  prompt({
    title: "Prerequisites",
    description: "The following actions are required to install this OS.",
    fields,
    confirm: "Continue"
  }).then(resolve);
});

// configure
mainEvent.on("user:configure", (fields, resolve) => {
  window.send("user:configure");
  prompt({
    title: "Installation options",
    dismissable: false,
    description: "Configure the installation of your new operating system",
    fields
  }).then(resolve);
});

// Request user_action
mainEvent.on("user:action", (action, callback) => {
  window.send("user:action", action);
  if (action.button) {
    ipcMain.once("action:completed", callback);
  }
});

// Request user_action
mainEvent.on("user:manual_download", (file, group, callback) => {
  window.send("user:manual_download", file, group);
  ipcMain.once("manual_download:completed", (e, path) => callback(path));
});

// Control the progress bar
mainEvent.on("user:write:progress", progress => {
  window.send("user:write:progress", progress);
});

// Installation successfull
mainEvent.on("user:write:done", () => {
  window.send("user:write:done");
  window.send("user:write:speed");
  log.info(
    "All done! Your device will now reboot and complete the installation. Enjoy exploring Ubuntu Touch!"
  );
  if (!settings.get("never.reportInstallationResult")) {
    setTimeout(() => {
      window.send("user:report", true);
    }, 1500);
  }
});

// Show working animation
mainEvent.on("user:write:working", animation => {
  window.send("user:write:working", animation);
});

// Set the top text in the footer
mainEvent.on("user:write:status", (status, waitDots) => {
  window.send("user:write:status", status, waitDots);
});

// Set the speed part of the footer
mainEvent.on("user:write:speed", speed => {
  window.send("user:write:speed", speed);
});

// Set the lower text in the footer
mainEvent.on("user:write:under", status => {
  window.send("user:write:under", status);
});

// Device is unsupported
mainEvent.on("user:device-unsupported", device => {
  log.warn("The device " + device + " is not supported!");
  window.send("user:device-unsupported", device);
});

// No internet connection
mainEvent.on("user:no-network", () => {
  prompt({
    title: "Internet connection lost",
    dismissable: true,
    description:
      "The installer failed to connect to the UBports servers. Are you connected to the internet? If you're using a proxy, you might have to [configure it](https://www.golinuxcloud.com/set-up-proxy-http-proxy-environment-variable/) by setting the **https_proxy** environment variable.",
    confirm: "Try again"
  }).then(() => mainEvent.emit("restart"));
});

// Visual C++ 2012 Redistributables x86 are not installed
mainEvent.on("user:no-msvc2012x86", () => {
  prompt({
    title: "Missing Dependencies",
    dismissable: true,
    description: `Your computer is missing the Visual C++ 2012 32-bit libraries. The installer will be unable to detect or flash Samsung devices.

Please download and install \`vcredist_x86.exe\` from [Microsoft's download page](https://www.microsoft.com/en-us/download/details.aspx?id=30679) and try again.

If you will not be installing on a Samsung device, you can continue without Samsung device support.`,
    confirm: "Try again"
  }).then(() => mainEvent.emit("restart"));
});

// Connection to the device was lost
mainEvent.on("user:connection-lost", reconnect => {
  log.warn("lost connection to device");
  prompt({
    title: "Connection to device lost",
    description: `The connection to your device was lost. Please make sure your device is still connected and do not disconnect your device again until the installation is finished.

If this continues to happen, you might want to try using a different USB cable. Old cables tend to become less reliable. Please try using a different USB cable and do not touch the device during the installation, unless you are prompted to do so.`,
    confirm: "Reconnect"
  }).then(() => {
    if (reconnect) setTimeout(reconnect, 500);
    else mainEvent.emit("restart");
  });
});

// The device battery is too low to install
mainEvent.on("user:low-power", () => {
  prompt({
    title: "Low Power",
    description: `The battery of your device is critically low. This can cause severe Problems while flashing.

Please let your device charge for a while and try again.`,
    confirm: "Try again"
  }).then(() => mainEvent.emit("restart"));
});

module.exports = mainEvent;
