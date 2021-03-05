const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const { adb } = require("../../helpers/deviceTools.js");
const adbPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

describe("adb plugin", () => {
  describe("init()", () => {
    it("should start server", () => {
      jest.spyOn(adb, "startServer").mockResolvedValue();
      return adbPlugin.init().then(() => {
        expect(adb.startServer).toHaveBeenCalledTimes(1);
        adb.startServer.mockRestore();
      });
    });
  });
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(adb, "kill").mockResolvedValue();
      return adbPlugin.kill().then(() => {
        expect(adb.kill).toHaveBeenCalledTimes(1);
        adb.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(adb, "wait").mockResolvedValue();
      jest.spyOn(adb, "getDeviceName").mockResolvedValue();
      return adbPlugin.wait().then(() => {
        expect(adb.wait).toHaveBeenCalledTimes(1);
        expect(adb.getDeviceName).toHaveBeenCalledTimes(1);
        adb.wait.mockRestore();
        adb.getDeviceName.mockRestore();
      });
    });
  });
});
