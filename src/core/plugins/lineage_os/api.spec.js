process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

const api = require("./api.js");

it("should construct", () => expect(require("./api.js")).toBeDefined());
