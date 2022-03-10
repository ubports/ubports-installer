"use strict";

/*
 * Copyright (C) 2017-2021 UBports Foundation <info@ubports.com>
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
const { Fastboot } = require("../../helpers/asarLibs.js").DeviceTools;

/**
 * fastboot plugin
 * @extends Plugin
 */
class FastbootPlugin extends Plugin {
  /**
   * @constructs FastbootPlugin
   * @param {Props} props properties
   * @param {String} cachePath cache path
   * @param {EventEmitter} event event
   * @param {Object} log logger
   */
  constructor(props, cachePath, event, log) {
    super(props, cachePath, event, log);
    this.fastboot = new Fastboot();
    ["exec", "spawn:start", "spawn:exit", "spawn:error"].forEach(event =>
      this.fastboot.on(event, r =>
        log.command(`${event}: ${JSON.stringify(r)}`)
      )
    );
  }

  /**
   * kill all running tasks
   * @returns {Promise}
   */
  kill() {
    return this.fastboot.kill();
  }

  /**
   * wait for a device
   * @virtual
   * @returns {Promise<String>}
   */
  wait() {
    return this.fastboot.wait().then(() => this.fastboot.getDeviceName());
  }

  /**
   * fastboot:oem_unlock
   * @param {Object} step {code_url}
   * @returns {Promise}
   */
  action__oem_unlock(step) {
    const code_url = step ? step.code_url : null;
    const _event = this.event;
    return new Promise((resolve, reject) =>
      _event.emit("user:oem-lock", false, code_url, code =>
        this.fastboot
          .oemUnlock(code)
          .then(resolve)
          .catch(err => {
            if (err.message.includes("enable unlocking")) {
              this.event.emit("user:oem-lock", true, code_url, code =>
                this.fastboot.oemUnlock(code).then(resolve).catch(reject)
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
    const _event = this.event;
    return new Promise((resolve, reject) =>
      _event.emit("user:oem-lock", false, null, () =>
        this.fastboot.flashingUnlock().then(resolve).catch(reject)
      )
    );
  }

  /**
   * fastboot:reboot_bootloader action
   * @returns {Promise}
   */
  action__reboot_bootloader() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Rebooting", true);
      this.event.emit("user:write:under", "Rebooting to bootloader");
      return this.fastboot.rebootBootloader();
    });
  }

  /**
   * fastboot:reboot_fastboot action
   * @returns {Promise}
   */
  action__reboot_fastboot() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Rebooting", true);
      this.event.emit("user:write:under", "Rebooting to fastbootd");
      return this.fastboot.rebootFastboot();
    });
  }

  /**
   * fastboot:reboot_recovery action
   * @returns {Promise}
   */
  action__reboot_recovery() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Rebooting", true);
      this.event.emit("user:write:under", "Rebooting to recovery");
      return this.fastboot.rebootRecovery();
    });
  }

  /**
   * fastboot:reboot action
   * @returns {Promise}
   */
  action__reboot() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Rebooting", true);
      this.event.emit("user:write:under", "Rebooting system");
      return this.fastboot.reboot();
    });
  }

  /**
   * fastboot:continue action
   * @returns {Promise}
   */
  action__continue() {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Continuing boot", true);
      this.event.emit("user:write:under", "Resuming boot");
      return this.fastboot.continue();
    });
  }

  /**
   * fastboot:set_active action
   * @returns {Promise}
   */
  action__set_active({ slot }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Setting slots", true);
      this.event.emit("user:write:under", `Activating slot ${slot}`);
      return this.fastboot.setActive(slot);
    });
  }

  /**
   * fastboot:flash action
   * @returns {Promise}
   */
  action__flash({ partitions }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "circuit");
      this.event.emit("user:write:status", "Flashing firmware", true);
      this.event.emit(
        "user:write:under",
        "Flashing firmware partitions using fastboot"
      );
      return this.fastboot
        .wait()
        .then(() =>
          this.fastboot.flash(
            partitions.map(file => ({
              ...file,
              file: path.join(
                this.cachePath,
                this.props.config.codename,
                file.group,
                file.file
              )
            })),
            p => this.event.emit("user:write:progress", p * 100)
          )
        )
        .then(() => this.event.emit("user:write:progress", 0));
    });
  }

  /**
   * fastboot:wipe_super action
   * @returns {Promise}
   */
  action__wipe_super({ image }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "circuit");
      this.event.emit("user:write:status", "Wiping super", true);
      this.event.emit(
        "user:write:under",
        "Wiping and repartitioning super partition using fastbootd"
      );
      return this.fastboot.wipeSuper(
        path.join(
          this.cachePath,
          this.props.config.codename,
          image.group,
          image.file
        )
      );
    });
  }

  /**
   * fastboot:erase action
   * @returns {Promise}
   */
  action__erase({ partition }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "squares");
      this.event.emit("user:write:status", "Cleaning up", true);
      this.event.emit(
        "user:write:under",
        "Erasing " + partition + " partition"
      );
      return this.fastboot.erase(partition);
    });
  }

  /**
   * fastboot:format action
   * @returns {Promise}
   */
  action__format({ partition, type, size }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "squares");
      this.event.emit("user:write:status", "Cleaning up", true);
      this.event.emit(
        "user:write:under",
        "Formatting " + partition + " partition"
      );
      return this.fastboot.format(partition, type, size);
    });
  }

  /**
   * fastboot:boot action
   * @returns {Promise}
   */
  action__boot({ group, file, partition }) {
    return Promise.resolve().then(() => {
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Rebooting");
      this.event.emit("user:write:under", "Your device is being rebooted...");
      return this.fastboot.boot(
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
      this.event.emit("user:write:working", "particles");
      this.event.emit("user:write:status", "Updating system", true);
      this.event.emit(
        "user:write:under",
        "Applying fastboot update zip. This may take a while..."
      );
      return this.fastboot.update(
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
        this.event.emit("user:write:working", "particles");
        this.event.emit("user:write:status", "Waiting for device", true);
        this.event.emit("user:write:under", "Fastboot is scanning for devices");
      })
      .then(() => this.fastboot.wait())
      .then(() => null); // ensure null is returned
  }
}

module.exports = FastbootPlugin;
