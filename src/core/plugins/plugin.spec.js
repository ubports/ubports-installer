const Plugin = require("./plugin.js");

it("should construct", () => expect(new Plugin()).toBeDefined());

describe("virtuals", () => {
  ["init", "kill"].forEach(virtual =>
    it(`should run ${virtual}`, () => new Plugin()[virtual]())
  );
});
