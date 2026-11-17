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
it("should properly parse build number", () => {
  jest.replaceProperty(process, "argv", [null, null, "-b", "2"]);
  expect(require("./cli.js").build).toEqual(2);
});
it("should reject invalid build number", () => {
  jest.replaceProperty(process, "argv", [null, null, "-b", "a"]);
  jest.spyOn(process.stderr, "write").mockImplementationOnce(() => {});
  jest.spyOn(process, "exit").mockImplementationOnce(() => {});
  expect(() => require("./cli.js")).toThrow("Not a number.");
  expect(process.stderr.write).toHaveBeenCalled();
  expect(process.exit).toHaveBeenCalledWith(1);
});
