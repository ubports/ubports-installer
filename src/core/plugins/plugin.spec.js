const Plugin = require("./plugin.js");

it("should construct", () => expect(new Plugin()).toBeDefined());

describe("virtuals", () => {
  ["init", "wait"].forEach(virtual =>
    it(`${virtual}() should resolve`, () => new Plugin()[virtual]())
  );
});
