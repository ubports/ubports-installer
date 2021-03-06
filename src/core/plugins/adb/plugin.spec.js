const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const adbPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

describe("adb plugin", () => {
  describe("init()", () => {
    it("should start server", () => {
      jest.spyOn(adbPlugin.adb, "startServer").mockResolvedValue();
      return adbPlugin.init().then(() => {
        expect(adbPlugin.adb.startServer).toHaveBeenCalledTimes(1);
        adbPlugin.adb.startServer.mockRestore();
      });
    });
  });
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(adbPlugin.adb, "kill").mockResolvedValue();
      return adbPlugin.kill().then(() => {
        expect(adbPlugin.adb.kill).toHaveBeenCalledTimes(1);
        adbPlugin.adb.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(adbPlugin.adb, "wait").mockResolvedValue();
      jest.spyOn(adbPlugin.adb, "getDeviceName").mockResolvedValue();
      return adbPlugin.wait().then(() => {
        expect(adbPlugin.adb.wait).toHaveBeenCalledTimes(1);
        expect(adbPlugin.adb.getDeviceName).toHaveBeenCalledTimes(1);
        adbPlugin.adb.wait.mockRestore();
        adbPlugin.adb.getDeviceName.mockRestore();
      });
    });
  });

  describe("action__shell()", () => {
    it("should run shell command", () => {
      jest.spyOn(adbPlugin.adb, "shell").mockResolvedValueOnce();
      return adbPlugin
        .action__shell({ args: ["echo", "hello", "world"] })
        .then(r => {
          expect(r).toEqual(null);
          expect(adbPlugin.adb.shell).toHaveBeenCalledTimes(1);
          expect(adbPlugin.adb.shell).toHaveBeenCalledWith(
            "echo",
            "hello",
            "world"
          );
          adbPlugin.adb.shell.mockRestore();
        });
    });
  });
});
