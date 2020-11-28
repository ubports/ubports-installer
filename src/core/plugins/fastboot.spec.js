const mainEvent = require("../../lib/mainEvent.js");
const { fastboot } = require("../../lib/deviceTools.js");
const fastbootPlugin = require("./fastboot.js").actions;

it("should be a singleton", () =>
  expect(fastbootPlugin).toEqual(require("./fastboot.js").actions));

describe("fastboot plugin", () => {
  describe("oem_unlock()", () => {
    it("should unlock", () => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockResolvedValue();
      return fastbootPlugin.oem_unlock().then(() => {
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
      return fastbootPlugin.oem_unlock().then(() => {
        mainEvent.emit.mockRestore();
        fastboot.oemUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, d, a, cb) => cb());
      jest.spyOn(fastboot, "oemUnlock").mockRejectedValue(new Error("problem"));
      fastbootPlugin.oem_unlock().catch(e => {
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
      return fastbootPlugin.flashing_unlock().then(() => {
        mainEvent.emit.mockRestore();
        fastboot.flashingUnlock.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest.spyOn(mainEvent, "emit").mockImplementation((m, cb) => cb());
      jest.spyOn(fastboot, "flashingUnlock").mockRejectedValue("ono");
      return fastbootPlugin.flashing_unlock().catch(e => {
        expect(e).toEqual("ono");
        mainEvent.emit.mockRestore();
        fastboot.flashingUnlock.mockRestore();
        done();
      });
    });
  });
});
