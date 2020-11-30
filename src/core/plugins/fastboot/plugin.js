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

const Plugin = require("../plugin.js");
const path = require("path");
const mainEvent = require("../../../lib/mainEvent.js");
const { fastboot } = require("../../../lib/deviceTools.js");

/**
 * fastboot plugin
 * @extends Plugin
 */
class FastbootPlugin extends Plugin {
  /**
   * fastboot:oem_unlock
   * @param {Object} step {code_url}
   * @returns {Promise}
   */
  action__oem_unlock(step) {
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
  action__flashing_unlock() {
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
  action__reboot_bootloader() {
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
  action__reboot() {
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
  action__continue() {
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
  action__set_active({ slot }) {
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
  action__flash({ partitions }) {
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
            partitions.map(file => ({
              ...file,
              file: path.join(
                this.cachePath,
                this.props.config.codename,
                file.group,
                file.file
              )
            })),
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
  action__erase({ partition }) {
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
  action__format({ partition, type, size }) {
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
  action__boot({ group, file, partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Rebooting");
      mainEvent.emit("user:write:under", "Your device is being rebooted...");
      return fastboot.boot(
        path.join(this.cachePath, this.props.config.codename, group, file),
        partition
      );
    });
  }

  /**
   * fastboot:update action
   * @returns {Promise}
   */
  action__update({ group, file, partition }) {
    return Promise.resolve().then(() => {
      mainEvent.emit("user:write:working", "particles");
      mainEvent.emit("user:write:status", "Updating system", true);
      mainEvent.emit(
        "user:write:under",
        "Applying fastboot update zip. This may take a while..."
      );
      return fastboot.update(
        path.join(
          this.cachePath,
          this.props.config.codename,
          step.group,
          step.file
        ),
        this.props.settings.wipe
      );
    });
  }

  /**
   * fastboot:wait action
   * @returns {Promise}
   */
  action__wait() {
    return Promise.resolve()
      .then(() => {
        mainEvent.emit("user:write:working", "particles");
        mainEvent.emit("user:write:status", "Waiting for device", true);
        mainEvent.emit("user:write:under", "Fastboot is scanning for devices");
      })
      .then(() => fastboot.wait())
      .then(() => null); // ensure null is returned
  }
}

module.exports = FastbootPlugin;
