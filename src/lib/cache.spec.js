const fs = require("fs-extra");
jest.mock("fs-extra");

it("should be a singleton", () => {
  expect(require("./cache.js")).toBe(require("./cache.js"));
});
