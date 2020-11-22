process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

it("should be a singleton", () => {
  expect(require("./updater.js")).toBe(require("./updater.js"));
});
