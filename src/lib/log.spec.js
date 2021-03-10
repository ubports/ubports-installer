process.argv = [null, null, "-vv"];
const winston = require("winston");
jest.mock("winston");

const levels = ["error", "warn", "info", "verbose", "debug", "command"];

it("should be a singleton", () => {
  expect(require("./log.js")).toBe(require("./log.js"));
});

describe("get()", () => {
  it("should resolve log file contents", () => {
    const log = require("./log.js");
    log.winston.query.mockImplementation((opts, cb) =>
      cb(null, {
        file: [{ level: "debug", message: "alrighty" }]
      })
    );
    return expect(log.get()).resolves.toEqual("debug: alrighty");
  });
  it("should reject on query error", () => {
    const log = require("./log.js");
    log.winston.query.mockImplementation((opts, cb) => cb(1));
    return expect(log.get()).rejects.toThrow("Failed to read log: 1");
  });
  it("should reject on parsing error", () => {
    const log = require("./log.js");
    log.winston.query.mockImplementation((opts, cb) => cb());
    return expect(log.get()).rejects.toThrow(
      "Failed to read log: TypeError: Cannot read property 'file' of undefined"
    );
  });
});

describe("setLevel()", function () {
  it("should update level", function () {
    const log = require("./log.js");
    log.setLevel();
    expect(log.stdout.level).toEqual("info");
    log.setLevel(1);
    expect(log.stdout.level).toEqual("verbose");
    log.setLevel(2);
    expect(log.stdout.level).toEqual("debug");
    log.setLevel(3);
    expect(log.stdout.level).toEqual("command");
    log.setLevel(1337);
    expect(log.stdout.level).toEqual("info");
  });
});

levels.forEach(level => {
  describe(`${level}()`, function () {
    it(`should log ${level}`, function () {
      const log = require("./log.js");
      log[level]("hello world");
      expect(log.winston.log).toHaveBeenCalledWith(level, "hello world");
    });
  });
});
