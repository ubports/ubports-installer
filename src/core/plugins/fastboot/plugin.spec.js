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
});
