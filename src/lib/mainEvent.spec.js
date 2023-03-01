process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

const window = require("./window.js");
jest.mock("./window.js");

const settings = require("./settings.js");
const mainEvent = require("./mainEvent.js");

it("should be a singleton", () => {
  expect(require("./mainEvent.js")).toBe(require("./mainEvent.js"));
});

beforeEach(() => jest.clearAllMocks());

describe("mainEvent", () => {
  describe("#emit", () => {
    it("should not show report when installation is finished", () => {
      settings.set("never.reportInstallationResult", true);
      mainEvent.emit("user:write:done");
      expect(window.send).toHaveBeenCalledWith("user:write:done");
      expect(window.send).toHaveBeenCalledWith("user:write:speed");
      expect(window.send).toHaveBeenCalledTimes(2);
    });
  });
});
