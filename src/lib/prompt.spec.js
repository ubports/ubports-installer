process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const window = require("./window.js");
jest.mock("./window.js");

const { prompt } = require("./prompt.js");

it("should be a singleton", () => {
  expect(require("./prompt.js")).toBe(require("./prompt.js"));
});

describe("prompt()", () => {
  it("should show prompt", () => {
    window.send.mockClear();
    ipcMain.once.mockClear();
    ipcMain.once.mockImplementation((channel, callback) => {
      callback({}, { token: "asdf" });
    });
    return prompt().then(res => {
      expect(res).toEqual({ token: "asdf" });
      expect(window.send).toHaveBeenCalledTimes(1);
    });
  });
});
