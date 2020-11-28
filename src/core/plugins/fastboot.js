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

const path = require("path");
const mainEvent = require("../../lib/mainEvent.js");
const { fastboot } = require("../../lib/deviceTools.js");

/**
 * Transform path array
 * @param {Array} files files
 * @param {String} device codename
 */
function addPathToFiles(files, device) {
  return files.map(file => ({
    ...file,
    file: path.join(cachePath, device, file.group, file.file)
  }));
}

/**
 * fastboot actions plugin
 */
class FastbootActionsPlugin {
  /**
   * fastboot:oem_unlock
   * @param {Object} step {code_url}
   * @returns {Promise}
   */
  oem_unlock(step) {
    const code_url = step ? step.code_url : null;
    return new Promise((resolve, reject) =>
      mainEvent.emit("user:oem-lock", false, code_url, code =>
        fastboot
          .oemUnlock(code)
          .then(resolve)
          .catch(err => {
            if (err.message.includes("enable unlocking")) {
              mainEvent.emit("user:oem-lock", true, code_url, code =>
                fastboot
                  .oemUnlock(code)
                  .then(resolve)
                  .catch(reject)
              );
            } else {
              reject(err);
            }
          })
      )
    );
  }

  /**
   * fastboot:flashing_unlock
   * @returns {Promise}
   */
  flashing_unlock() {
    return new Promise((resolve, reject) =>
      mainEvent.emit("user:flashing-lock", () =>
        fastboot
          .flashingUnlock()
          .then(resolve)
          .catch(reject)
      )
    );
  }

  /**
   * fastboot:reboot_bootloader action
   * @returns {Promise}
   */
  reboot_bootloader() {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Rebooting", true);
      mainEvent.emit("user:write:under", "Rebooting to bootloader");
      return fastboot.rebootBootloader();
    });
  }

  /**
   * fastboot:reboot action
   * @returns {Promise}
   */
  reboot() {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Rebooting", true);
      mainEvent.emit("user:write:under", "Rebooting system");
      return fastboot.reboot();
    });
  }

  /**
   * fastboot:continue action
   * @returns {Promise}
   */
  continue() {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Continuing boot", true);
      mainEvent.emit("user:write:under", "Resuming boot");
      return fastboot.continue();
    });
  }

  /**
   * fastboot:set_active action
   * @returns {Promise}
   */
  set_active({ slot }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Setting slots", true);
      mainEvent.emit("user:write:under", `Activating slot ${slot}`);
      return fastboot.setActive(slot);
    });
  }

  /**
   * fastboot:flash action
   * @returns {Promise}
   */
  flash({ partitions }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Flashing firmware", true);
      mainEvent.emit(
        "user:write:under",
        "Flashing firmware partitions using fastboot"
      );
      return fastboot
        .wait()
        .then(() =>
          fastboot.flash(
            addPathToFiles(partitions, global.installProperties.device), // FIXME
            p => mainEvent.emit("user:write:progress", p * 100)
          )
        )
        .then(() => mainEvent.emit("user:write:progress", 0));
    });
  }

  /**
   * fastboot:erase action
   * @returns {Promise}
   */
  erase({ partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Cleaning up", true);
      mainEvent.emit("user:write:under", "Erasing " + partition + " partition");
      return fastboot.erase(partition);
    });
  }

  /**
   * fastboot:format action
   * @returns {Promise}
   */
  format({ partition, type, size }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Cleaning up", true);
      mainEvent.emit(
        "user:write:under",
        "Formatting " + partition + " partition"
      );
      return fastboot.format(partition, type, size);
    });
  }

  /**
   * fastboot:boot action
   * @returns {Promise}
   */
  boot({ group, file, partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Rebooting");
      mainEvent.emit("user:write:under", "Your device is being rebooted...");
      return fastboot.boot(
        path.join(cachePath, global.installProperties.device, group, file),
        partition
      );
    });
  }

  /**
   * fastboot:update action
   * @returns {Promise}
   */
  update({ group, file, partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Updating system", true);
      mainEvent.emit(
        "user:write:under",
        "Applying fastboot update zip. This may take a while..."
      );
      return fastboot.update(
        path.join(
          cachePath,
          global.installProperties.device,
          step.group,
          step.file
        ),
        global.installProperties.settings.wipe
      );
    });
  }

  /**
   * fastboot:wait action
   * @returns {Promise}
   */
  wait() {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Waiting for device", true);
        mainEvent.emit("user:write:under", "Fastboot is scanning for devices");
      })
      .then(() => fastboot.wait());
  }
}

module.exports = {
  actions: new FastbootActionsPlugin()
};
