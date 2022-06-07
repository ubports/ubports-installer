process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const window = require("./window.js");
jest.mock("./window.js");
const mainEvent = require("./mainEvent.js");
jest.mock("./mainEvent.js");
const errors = require("./errors.js");

it("should be a singleton", () => {
  expect(require("./errors.js")).toBe(require("./errors.js"));
});

afterEach(() => jest.clearAllMocks());

describe("toUser()", () => {
  it("should die if no window", () => {
    window.getMain.mockReturnValue(false);
    jest.spyOn(errors, "die").mockReturnValue();
    return errors.toUser(new Error("some error"), "here").then(() => {
      expect(errors.die).toHaveBeenCalledTimes(1);
      expect(errors.die).toHaveBeenCalledWith(expect.any(Error));
    });
  });
  it("should escalate and restart", () => {
    window.getMain.mockReturnValue(true);
    mainEvent.on("user:error", (message, restart, ignore) => {
      expect(message).toEqual("Error: here: Error: some error");
      expect(restart).toBeInstanceOf(Function);
      expect(ignore).toBeInstanceOf(Function);
      restart();
    });
    return errors
      .toUser(
        new Error("some error"),
        "here",
        () => Promise.resolve("this is expected"),
        () => Promise.reject("this should not have been called")
      )
      .then(r => {
        expect(r).toEqual("this is expected");
      });
  });
  it("should escalate and ignore", () => {
    window.getMain.mockReturnValue(true);
    mainEvent.on("user:error", (message, restart, ignore) => {
      expect(message).toEqual("Error: Unknown: some error");
      expect(restart).toBeInstanceOf(Function);
      expect(ignore).toBeInstanceOf(Function);
      ignore();
    });
    return errors
      .toUser("some error", null, () =>
        Promise.reject("this should not have been called")
      )
      .then(r => {
        expect(r).toEqual(null);
      });
  });
});
