process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

it("should be a singleton", () => {
  expect(require("./system-image.js")).toBe(require("./system-image.js"));
});
