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

  describe("create_logical_partition()", () => {
    it("should create logical partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "createLogicalPartition").mockResolvedValue();
      return fastbootPlugin
        .action__create_logical_partition({
          partition: "dummypart0",
          size: "10"
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.createLogicalPartition).toHaveBeenCalledWith(
            "dummypart0", "10"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Creating logical partition"),
            true
          );
          fastbootPlugin.fastboot.createLogicalPartition.mockRestore();
        });
    });
  });

  describe("delete_logical_partition()", () => {
    it("should delete logical partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "deleteLogicalPartition").mockResolvedValue();
      return fastbootPlugin
        .action__delete_logical_partition({
          partition: "dummypart9"
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.deleteLogicalPartition).toHaveBeenCalledWith(
            "dummypart9"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Deleting logical partition"),
            true
          );
          fastbootPlugin.fastboot.deleteLogicalPartition.mockRestore();
        });
    });
  });

  describe("resize_logical_partition()", () => {
    it("should resize logical partition", () => {
      jest.spyOn(fastbootPlugin.fastboot, "resizeLogicalPartition").mockResolvedValue();
      return fastbootPlugin
        .action__resize_logical_partition({
          partition: "dummypart4",
          size: "100"
        })
        .then(() => {
          expect(fastbootPlugin.fastboot.resizeLogicalPartition).toHaveBeenCalledWith(
            "dummypart4", "100"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            expect.stringMatching("Resizing logical partition"),
            true
          );
          fastbootPlugin.fastboot.resizeLogicalPartition.mockRestore();
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
