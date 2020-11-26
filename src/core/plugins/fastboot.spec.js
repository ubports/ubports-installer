const fastboot = require("./fastboot.js");

it("should be a singleton", () =>
  expect(fastboot).toEqual(require("./fastboot.js")));
