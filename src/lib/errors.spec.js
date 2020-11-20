const { ipcMain } = require("electron");
jest.mock("electron");

it("should be a singleton", () => {
  expect(require("./errors.js")).toBe(require("./errors.js"));
});
