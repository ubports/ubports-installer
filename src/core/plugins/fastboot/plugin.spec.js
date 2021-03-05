const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const { fastboot } = require("../../helpers/deviceTools.js");
const fastbootPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

describe("fastboot plugin", () => {
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(fastboot, "kill").mockResolvedValue();
      return fastbootPlugin.kill().then(() => {
        expect(fastboot.kill).toHaveBeenCalledTimes(1);
        fastboot.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(fastboot, "wait").mockResolvedValue();
      jest.spyOn(fastboot, "getDeviceName").mockResolvedValue();
      return fastbootPlugin.wait().then(() => {
        expect(fastboot.wait).toHaveBeenCalledTimes(1);
        expect(fastboot.getDeviceName).toHaveBeenCalledTimes(1);
        fastboot.wait.mockRestore();
        fastboot.getDeviceName.mockRestore();
      });
    });
  });
  describe("oem_unlock()", () => {
    it("should unlock", () => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockResolvedValue();
      return fastbootPlugin.action__oem_unlock().then(() => {
        fastboot.oemUnlock.mockRestore();
      });
    });
    it("should instruct enabling", () => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockResolvedValue();
      jest
        .spyOn(fastboot, "oemUnlock")
        .mockRejectedValueOnce(new Error("enable unlocking"));
      return fastbootPlugin.action__oem_unlock().then(() => {
        fastboot.oemUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      mainEvent.emit.mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockRejectedValue(new Error("problem"));
      fastbootPlugin.action__oem_unlock().catch(e => {
        expect(e.message).toEqual("problem");
        fastboot.oemUnlock.mockRestore();
        done();
      });
    });
  });
  describe("flashing_unlock()", () => {
    it("should unlock", () => {
      mainEvent.emit.mockImplementation((m, x, y, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockResolvedValue();
      return fastbootPlugin.action__flashing_unlock().then(() => {
        fastboot.flashingUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      mainEvent.emit.mockImplementation((m, x, y, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockRejectedValue("ono");
      return fastbootPlugin.action__flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
});
