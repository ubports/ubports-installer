const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());

const { heimdall } = require("../../helpers/deviceTools.js");
const heimdallPlugin = new (require("./plugin.js"))({}, "a", mainEvent);

describe("heimdall plugin", () => {
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(heimdall, "kill").mockResolvedValue();
      return heimdallPlugin.kill().then(() => {
        expect(heimdall.kill).toHaveBeenCalledTimes(1);
        heimdall.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(heimdall, "wait").mockResolvedValue();
      return heimdallPlugin.wait().then(r => {
        expect(r).toEqual("Unknown");
        expect(heimdall.wait).toHaveBeenCalledTimes(1);
        heimdall.wait.mockRestore();
      });
    });
  });
});
