const adb = require("./plugin.js");

it("should be a singleton", () => expect(adb).toEqual(require("./plugin.js")));
