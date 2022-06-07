jest.useFakeTimers();
process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
process.argv = [];
const mainEvent = require("./lib/mainEvent.js");
const { main } = require("./main.js");
const window = require("./lib/window.js");
jest.mock("./lib/window.js");
const core = require("./core/core.js");
jest.mock("./core/core.js");

it("should be a singleton", () => {
  expect(require("./main.js")).toBeDefined();
});

describe("main", () => {
  describe("restart", () => {
    it("should restart the app", () => {
      mainEvent.emit("restart");
      expect(window.send).toHaveBeenCalledWith("user:restart");
      expect(window.send).toHaveBeenCalledTimes(1);
      expect(core.reset).toHaveBeenCalledTimes(1);
      expect(core.prepare).toHaveBeenCalledTimes(1);
      expect(core.prepare).toHaveBeenCalledWith(undefined, true);
    });
  });
});
