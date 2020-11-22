process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
process.argv = [];

it("should be a singleton", () => {
  expect(require("./main.js")).toBeDefined();
});
