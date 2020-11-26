const heimdall = require("./heimdall.js");

it("should be a singleton", () =>
  expect(heimdall).toEqual(require("./heimdall.js")));
