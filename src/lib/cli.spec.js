process.argv = [null, null, "-vv"];

beforeEach(() => {
  jest.resetModules();
});
afterEach(() => {
  jest.restoreAllMocks();
});

it("should be a singleton", () => {
  expect(require("./cli.js")).toBe(require("./cli.js"));
});
it("should properly parse verbosity", () => {
  jest.replaceProperty(process, "argv", [null, null, "-vvv"]);
  expect(require("./cli.js").verbose).toEqual(3);
});
