process.argv = [null, null, "-vv"];

it("should be a singleton", () => {
  expect(require("./cli.js")).toBe(require("./cli.js"));
});
it("should properly parse verbosity", () => {
  expect(require("./cli.js").verbose).toEqual(2);
});
