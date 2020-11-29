const mainEvent = require("../../../lib/mainEvent.js");
const { fastboot } = require("../../../lib/deviceTools.js");
const fastbootPlugin = new (require("./plugin.js"))();

describe("fastboot plugin", () => {
  describe("oem_unlock()", () => {
    it("should unlock", () => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockResolvedValue();
      return fastbootPlugin.action__oem_unlock().then(() => {
        mainEvent.emit.mockRestore();
        fastboot.oemUnlock.mockRestore();
      });
    });
    it("should instruct enabling", () => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockResolvedValue();
      jest
        .spyOn(fastboot, "oemUnlock")
        .mockRejectedValueOnce(new Error("enable unlocking"));
      return fastbootPlugin.action__oem_unlock().then(() => {
        mainEvent.emit.mockRestore();
        fastboot.oemUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockRejectedValue(new Error("problem"));
      fastbootPlugin.action__oem_unlock().catch(e => {
        expect(e.message).toEqual("problem");
        mainEvent.emit.mockRestore();
        fastboot.oemUnlock.mockRestore();
        done();
      });
    });
  });
  describe("flashing_unlock()", () => {
    it("should unlock", () => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockResolvedValue();
      return fastbootPlugin.action__flashing_unlock().then(() => {
        mainEvent.emit.mockRestore();
        fastboot.flashingUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockRejectedValue("ono");
      return fastbootPlugin.action__flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        mainEvent.emit.mockRestore();
        fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
});
