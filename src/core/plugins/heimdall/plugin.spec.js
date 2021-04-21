const mainEvent = { emit: jest.fn() };
const log = { warn: jest.fn() };
beforeEach(() => {
  mainEvent.emit.mockReset();
  log.warn.mockReset();
});

const heimdallPlugin = new (require("./plugin.js"))({}, "a", mainEvent, log);

describe("heimdall plugin", () => {
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(heimdallPlugin.heimdall, "kill").mockResolvedValue();
      return heimdallPlugin.kill().then(() => {
        expect(heimdallPlugin.heimdall.kill).toHaveBeenCalledTimes(1);
        heimdallPlugin.heimdall.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(heimdallPlugin.heimdall, "wait").mockResolvedValue();
      return heimdallPlugin.wait().then(r => {
        expect(r).toEqual("Unknown");
        expect(heimdallPlugin.heimdall.wait).toHaveBeenCalledTimes(1);
        heimdallPlugin.heimdall.wait.mockRestore();
      });
    });
  });
  describe("init()", () => {
    it("should execute Heimdall", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.resolve());
      return heimdallPlugin.init().then(r => {
        expect(r).toEqual(true);
        expect(hasAccess).toHaveBeenCalledTimes(1);
      });
    });
    it("should emit user:no-msvc2012x86 when heimdall fails with dll error", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() =>
          Promise.reject(new Error('{"error": {"code": 3221225781}}'))
        );
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return heimdallPlugin.init().then(() => {
        expect(mainEvent.emit).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith("user:no-msvc2012x86");
      });
    });
    it("should throw when heimdall throws a json error", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.reject(new Error('{"error": {}}')));
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return expect(heimdallPlugin.init()).rejects.toThrow('{"error": {}}');
    });
    it("should throw and log a warning when heimdall throws a non-json error somehow", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.reject(new Error("¯\\_(ツ)_/¯")));
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return expect(heimdallPlugin.init())
        .rejects.toThrow("¯\\_(ツ)_/¯")
        .then(() => expect(log.warn).toHaveBeenCalledTimes(1));
    });
  });
});
