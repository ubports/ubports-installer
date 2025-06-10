const Plugin = require("./plugin.js");

it("should construct", () => expect(new Plugin()).toBeDefined());

describe("virtuals", () => {
  ["init", "abort"].forEach(virtual =>
    it(`${virtual}() should resolve`, () => new Plugin()[virtual]())
  );
  ["wait"].forEach(virtual =>
    it(`${virtual}() should be pending`, () => new Plugin()[virtual]().cancel())
  );
});
