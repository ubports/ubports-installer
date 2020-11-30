const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const { fastboot } = require("../../../lib/deviceTools.js");
const fastbootPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

describe("fastboot plugin", () => {
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
      mainEvent.emit.mockImplementation((m, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockResolvedValue();
      return fastbootPlugin.action__flashing_unlock().then(() => {
        fastboot.flashingUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      mainEvent.emit.mockImplementation((m, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockRejectedValue("ono");
      return fastbootPlugin.action__flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
});
