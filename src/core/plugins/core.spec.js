const core = require("./core.js");

it("should be a singleton", () =>
  expect(core).toEqual(require("./core.js"))
)
