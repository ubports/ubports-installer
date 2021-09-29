process.argv = [null, null, "-vv"];
const log = require("./log.js");
jest.mock("./log.js");
const settings = require("./settings.js");
const { prompt } = require("./prompt.js");
jest.mock("./prompt.js");
const { OpenCutsReporter } = require("open-cuts-reporter");
jest.mock("open-cuts-reporter");

const reporter = require("./reporter.js");

it("should be a singleton", () => {
  expect(require("./reporter.js")).toBe(require("./reporter.js"));
});

describe("prepareErrorReport()", () => {
  it("should return error report object", () => {
    expect(reporter.prepareErrorReport()).resolves.toBeDefined();
  });
});

describe("prepareSuccessReport()", () => {
  it("should return success report object", () => {
    expect(reporter.prepareSuccessReport()).resolves.toBeDefined();
  });
});

describe("sendBugReport()", () => {
  it("should send bug report", () => {
    log.get.mockResolvedValue("log content");
    return reporter
      .sendBugReport({
        title: "wasd"
      })
      .then(r => {
        expect(r).toEqual(undefined);
      });
  });
});

describe("sendOpenCutsRun()", () => {
  it("should send open-cuts run", () => {
    log.get.mockResolvedValue("log content");
    expect(
      reporter.sendOpenCutsRun(null, {
        result: "PASS"
      })
    ).resolves.toEqual(undefined);
  });
});

describe("report()", () => {
  ["PASS", "WONKY", "FAIL"].forEach(result => {
    it(`should show ${result} report dialog`, () => {
      prompt.mockClear();
      prompt.mockResolvedValue({});
      return reporter.report(result, null).then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog with err msg`, () => {
      prompt.mockClear();
      prompt.mockResolvedValue({});
      return reporter.report(result, "some error").then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog and survive if closed`, () => {
      prompt.mockClear();
      prompt.mockResolvedValue();
      return reporter.report(result, null).then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog and survive error`, () => {
      prompt.mockClear();
      prompt.mockRejectedValue("some error");
      return reporter.report(result, null);
    });
  });
});

describe("tokenDialog()", () => {
  it("should show token dialog and set value", () => {
    prompt.mockClear();
    prompt.mockResolvedValue({ token: "asdf" });
    return reporter.tokenDialog().then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledWith("opencuts_token", "asdf");
    });
  });
  it("should fail silently if token unset", () => {
    prompt.mockClear();
    settings.set.mockClear();
    prompt.mockRejectedValue("some error");
    return reporter.tokenDialog().then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(0);
    });
  });
  it("should fail silently on prompt error", () => {
    prompt.mockClear();
    settings.set.mockClear();
    prompt.mockResolvedValue({ unxpected: "value" });
    return reporter.tokenDialog().then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(0);
    });
  });
});
