const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const fastbootPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

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
      return fastbootPlugin.action__flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        fastbootPlugin.fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
});
