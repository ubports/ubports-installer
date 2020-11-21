it("should be a singleton", () => {
  expect(require("./mainEvent.js")).toBe(require("./mainEvent.js"));
});
