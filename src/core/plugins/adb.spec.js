const adb = require("./adb.js");

it("should be a singleton", () =>
  expect(adb).toEqual(require("./adb.js"))
)
