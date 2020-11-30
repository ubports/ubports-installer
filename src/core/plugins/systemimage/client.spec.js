process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

it("should construct", () =>
  expect(new (require("./client.js"))()).toBeDefined());
