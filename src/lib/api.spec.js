const Api = require("ubports-api-node-module").Installer;
jest.mock("ubports-api-node-module");

it("should be a singleton", () => {
  expect(require("./api.js")).toBe(require("./api.js"));
});
