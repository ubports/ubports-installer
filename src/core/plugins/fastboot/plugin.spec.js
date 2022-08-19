const path = require("path");
const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const CODENAME = "CODENAME";
const CACHE_PATH = "CACHE_PATH";

const fastbootPlugin = new (require("./plugin.js"))(
  {
    config: {
      codename: CODENAME
    }
  },
  CACHE_PATH,
  mainEvent
);

describe("fastboot plugin", () => {
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(fastbootPlugin.fastboot, "kill").mockResolvedValue();
      return fastbootPlugin.kill().then(() => {
        expect(fastbootPlugin.fastboot.kill).toHaveBeenCalledTimes(1);
        fastbootPlugin.fastboot.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(fastbootPlugin.fastboot, "wait").mockResolvedValue();
      jest.spyOn(fastbootPlugin.fastboot, "getDeviceName").mockResolvedValue();
      return fastbootPlugin.wait().then(() => {
        expect(fastbootPlugin.fastboot.wait).toHaveBeenCalledTimes(1);
        expect(fastbootPlugin.fastboot.getDeviceName).toHaveBeenCalledTimes(1);
        fastbootPlugin.fastboot.wait.mockRestore();
        fastbootPlugin.fastboot.getDeviceName.mockRestore();
      });
    });
  });
  describe("update()", () => {
    it("should update", () => {
      jest.spyOn(fastbootPlugin.fastboot, "update").mockResolvedValue();
      return fastbootPlugin
        .action__update({ group: "group", file: "image" })
        .then(() => {
          expect(fastbootPlugin.fastboot.update).toHaveBeenCalledTimes(1);
          expect(fastbootPlugin.fastboot.update).toHaveBeenCalledWith(
            expect.stringMatching(/.*group.image/),
            undefined
          );
          fastbootPlugin.fastboot.update.mockRestore();
        });
    });
  });
  describe("oem_unlock()", () => {
    it("should unlock", () => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastbootPlugin.fastboot, "oemUnlock").mockResolvedValue();
      return fastbootPlugin.action__oem_unlock().then(() => {
        fastbootPlugin.fastboot.oemUnlock.mockRestore();
      });
    });
    it("should instruct enabling", () => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastbootPlugin.fastboot, "oemUnlock").mockResolvedValue();
      jest
        .spyOn(fastbootPlugin.fastboot, "oemUnlock")
        .mockRejectedValueOnce(new Error("enable unlocking"));
      return fastbootPlugin.action__oem_unlock().then(() => {
        fastbootPlugin.fastboot.oemUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest
        .spyOn(fastbootPlugin.fastboot, "oemUnlock")
        .mockRejectedValue(new Error("problem"));
      fastbootPlugin.action__oem_unlock().catch(e => {
        expect(e.message).toEqual("problem");
        fastbootPlugin.fastboot.oemUnlock.mockRestore();
        done();
      });
    });
  });
  describe("flashing_unlock()", () => {
    it("should unlock", () => {
      mainEvent.emit.mockImplementation((m, x, y, cb) => cb());
      jest.spyOn(fastbootPlugin.fastboot, "flashingUnlock").mockResolvedValue();
      return fastbootPlugin.action__flashing_unlock().then(() => {
        fastbootPlugin.fastboot.flashingUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      mainEvent.emit.mockImplementation((m, x, y, cb) => cb());
      jest
        .spyOn(fastbootPlugin.fastboot, "flashingUnlock")
        .mockRejectedValue("ono");
      fastbootPlugin.action__flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        fastbootPlugin.fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
  describe("boot()", () => {
    it("should boot custom image", () => {
      jest.spyOn(fastbootPlugin.fastboot, "boot").mockResolvedValue();
      return fastbootPlugin
        .action__boot({
          partition: "boot",
          file: "boot.img",
          group: "firmware"
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.boot).toHaveBeenCalledTimes(1);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching("Your device is being rebooted...")
          );
          fastbootPlugin.fastboot.boot.mockRestore();
        });
    });
  });
  describe("continue()", () => {
    it("should continue/resume booting", () => {
      jest.spyOn(fastbootPlugin.fastboot, "continue").mockResolvedValue();
      return fastbootPlugin.action__continue().then(() => {
        expect(fastbootPlugin.fastboot.continue).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("Resuming boot")
        );
        fastbootPlugin.fastboot.continue.mockRestore();
      });
    });
  });
  describe("erase()", () => {
    it("should erase partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "erase").mockResolvedValue();
      return fastbootPlugin.action__erase({ partition: "dtbo" }).then(() => {
        expect(fastbootPlugin.fastboot.erase).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("Erasing dtbo partition")
        );
        fastbootPlugin.fastboot.erase.mockRestore();
      });
    });
  });
  describe("flash()", () => {
    it("should flash partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "wait").mockResolvedValue();
      jest.spyOn(fastbootPlugin.fastboot, "flash").mockResolvedValue();
      return fastbootPlugin
        .action__flash({
          partitions: [
            {
              partition: "dtbo",
              file: "dtbo.img",
              group: "firmware"
            },
            {
              partition: "recovery",
              file: "recovery.img",
              group: "firmware"
            },
            {
              partition: "vbmeta",
              file: "vbmeta.img",
              group: "firmware"
            }
          ]
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.wait).toHaveBeenCalledTimes(1);
          expect(fastbootPlugin.fastboot.flash).toHaveBeenCalledTimes(1);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching("Flashing firmware partitions using fastboot")
          );
          fastbootPlugin.fastboot.flash.mockRestore();
          fastbootPlugin.fastboot.wait.mockRestore();
        });
    });
  });
  describe("format()", () => {
    it("should format partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "format").mockResolvedValue();
      return fastbootPlugin
        .action__format({ partition: "userdata", type: "f2fs" })
        .then(() => {
          expect(fastbootPlugin.fastboot.format).toHaveBeenCalledTimes(1);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching("Formatting userdata partition")
          );
          fastbootPlugin.fastboot.format.mockRestore();
        });
    });
  });
  describe("reboot()", () => {
    it("should reboot into system", () => {
      jest.spyOn(fastbootPlugin.fastboot, "reboot").mockResolvedValue();
      return fastbootPlugin.action__reboot().then(() => {
        expect(fastbootPlugin.fastboot.reboot).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("system")
        );
        fastbootPlugin.fastboot.reboot.mockRestore();
      });
    });
  });
  describe("reboot_bootloader()", () => {
    it("should reboot into bootloader", () => {
      jest
        .spyOn(fastbootPlugin.fastboot, "rebootBootloader")
        .mockResolvedValue();
      return fastbootPlugin.action__reboot_bootloader().then(() => {
        expect(fastbootPlugin.fastboot.rebootBootloader).toHaveBeenCalledTimes(
          1
        );
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("bootloader")
        );
        fastbootPlugin.fastboot.rebootBootloader.mockRestore();
      });
    });
  });
  describe("reboot_recovery()", () => {
    it("should reboot into recovery", () => {
      jest.spyOn(fastbootPlugin.fastboot, "rebootRecovery").mockResolvedValue();
      return fastbootPlugin.action__reboot_recovery().then(() => {
        expect(fastbootPlugin.fastboot.rebootRecovery).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("recovery")
        );
        fastbootPlugin.fastboot.rebootRecovery.mockRestore();
      });
    });
  });
  describe("reboot_fastboot()", () => {
    it("should reboot into fastbootd", () => {
      jest.spyOn(fastbootPlugin.fastboot, "rebootFastboot").mockResolvedValue();
      return fastbootPlugin.action__reboot_fastboot().then(() => {
        expect(fastbootPlugin.fastboot.rebootFastboot).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("fastbootd")
        );
        fastbootPlugin.fastboot.rebootFastboot.mockRestore();
      });
    });
  });
  describe("set_active()", () => {
    it("should set slot a as active", () => {
      jest.spyOn(fastbootPlugin.fastboot, "setActive").mockResolvedValue();
      return fastbootPlugin.action__set_active({ slot: "a" }).then(() => {
        expect(fastbootPlugin.fastboot.setActive).toHaveBeenCalledWith("a");
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("Activating slot a")
        );
        fastbootPlugin.fastboot.setActive.mockRestore();
      });
    });
  });
  describe("createLogicalPartition()", () => {
    it("should create logical partition", () => {
      jest
        .spyOn(fastbootPlugin.fastboot, "createLogicalPartition")
        .mockResolvedValue();
      return fastbootPlugin
        .action__create_logical_partition({
          partition: "partition_name",
          size: 3221225472
        })
        .then(() => {
          expect(
            fastbootPlugin.fastboot.createLogicalPartition
          ).toHaveBeenCalledWith("partition_name", 3221225472);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Creating logical partition"),
            true
          );
          fastbootPlugin.fastboot.createLogicalPartition.mockRestore();
        });
    });
  });
  describe("deleteLogicalPartition()", () => {
    it("should delete logical partition", () => {
      jest
        .spyOn(fastbootPlugin.fastboot, "deleteLogicalPartition")
        .mockResolvedValue();
      return fastbootPlugin
        .action__delete_logical_partition({
          partition: "partition_name"
        })
        .then(() => {
          expect(
            fastbootPlugin.fastboot.deleteLogicalPartition
          ).toHaveBeenCalledWith("partition_name");
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Deleting logical partition"),
            true
          );
          fastbootPlugin.fastboot.deleteLogicalPartition.mockRestore();
        });
    });
  });
  describe("resizeLogicalPartition()", () => {
    it("should resize logical partition", () => {
      jest
        .spyOn(fastbootPlugin.fastboot, "resizeLogicalPartition")
        .mockResolvedValue();
      return fastbootPlugin
        .action__resize_logical_partition({
          partition: "partition_name",
          size: 3221225472
        })
        .then(() => {
          expect(
            fastbootPlugin.fastboot.resizeLogicalPartition
          ).toHaveBeenCalledWith("partition_name", 3221225472);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Resizing logical partition"),
            true
          );
          fastbootPlugin.fastboot.resizeLogicalPartition.mockRestore();
        });
    });
  });
  describe("wait()", () => {
    it("should wait until devices are available for fastboot usage", () => {
      jest.spyOn(fastbootPlugin.fastboot, "wait").mockResolvedValue();
      return fastbootPlugin.action__wait().then(() => {
        expect(fastbootPlugin.fastboot.wait).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          expect.stringMatching("Fastboot is scanning for devices")
        );
        fastbootPlugin.fastboot.wait.mockRestore();
      });
    });
  });
  describe("wipe_super()", () => {
    it("should wipe super", () => {
      jest.spyOn(fastbootPlugin.fastboot, "wipeSuper").mockResolvedValue();
      return fastbootPlugin
        .action__wipe_super({
          image: {
            group: "group",
            file: "file"
          }
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.wipeSuper).toHaveBeenCalledWith(
            path.join(CACHE_PATH, CODENAME, "group", "file")
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("super"),
            true
          );
          fastbootPlugin.fastboot.wipeSuper.mockRestore();
        });
    });
  });
  describe("action__assert_var()", () => {
    [
      {
        comment: "value",
        arg: {
          variable: "somevar",
          value: "asdf"
        }
      },
      {
        comment: "regex w/ flags",
        arg: {
          variable: "somevar",
          regex: {
            pattern: "a[s,d]*f",
            flags: "i"
          }
        }
      },
      {
        comment: "regex w/o flags",
        arg: {
          variable: "somevar",
          regex: {
            pattern: "a[s,d]*f"
          }
        }
      },
      {
        comment: "string in regex",
        arg: {
          variable: "somevar",
          regex: {
            pattern: "asdf"
          }
        }
      }
    ].forEach(({ comment, arg }) => {
      it(`should assert and pass variable from ${comment}`, () => {
        jest.spyOn(fastbootPlugin.fastboot, "getvar").mockResolvedValue("asdf");
        return fastbootPlugin.action__assert_var(arg).then(r => {
          expect(r).not.toBeDefined();
          expect(fastbootPlugin.fastboot.getvar).toHaveBeenCalledWith(
            arg.variable
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching(/Asserting .* bootloader variable/)
          );
          fastbootPlugin.fastboot.getvar.mockRestore();
        });
      });
      it(`should assert and fail variable from ${comment}`, done => {
        jest.spyOn(fastbootPlugin.fastboot, "getvar").mockResolvedValue("wasd");
        fastbootPlugin.action__assert_var(arg).catch(e => {
          expect(e.message).toMatch(
            /Assertion error: expected bootloader variable .* to (be|match) .* but got wasd/
          );
          expect(fastbootPlugin.fastboot.getvar).toHaveBeenCalledWith(
            arg.variable
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching(/Asserting .* bootloader variable/)
          );
          fastbootPlugin.fastboot.getvar.mockRestore();
          done();
        });
      });
    });
  });
});
