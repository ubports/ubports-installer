const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const heimdallPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

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
});
