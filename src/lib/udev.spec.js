const { ipcMain } = require("electron");
jest.mock("electron");

it("should be a singleton", () => {
  expect(require("./udev.js")).toBe(require("./udev.js"));
});
