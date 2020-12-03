const heimdall = require("./plugin.js");

it("should be a singleton", () =>
  expect(heimdall).toEqual(require("./plugin.js")));
