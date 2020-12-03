const systemimage = require("./plugin.js");

it("should be a singleton", () =>
  expect(systemimage).toEqual(require("./plugin.js")));
