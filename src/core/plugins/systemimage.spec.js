const systemimage = require("./systemimage.js");

it("should be a singleton", () =>
  expect(systemimage).toEqual(require("./systemimage.js"))
)
