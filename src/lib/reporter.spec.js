const log = require("./log.js");
jest.mock("./log.js");
const settings = require("./settings.js");
const prompt = require("electron-dynamic-prompt");
jest.mock("electron-dynamic-prompt");
const { OpenCutsReporter } = require("open-cuts-reporter");
jest.mock("open-cuts-reporter");
const { paste } = require("ubuntu-pastebin");
jest.mock("ubuntu-pastebin");

const reporter = require("./reporter.js");

it("should be a singleton", () => {
  expect(require("./reporter.js")).toBe(require("./reporter.js"));
});

describe("prepareErrorReport()", () => {
  it("should return error report object", () => {
    global.installProperties = { device: undefined };
    expect(reporter.prepareErrorReport()).resolves.toBeDefined();
  });
});

describe("prepareSuccessReport()", () => {
  it("should return success report object", () => {
    global.installProperties = {
      device: "bacon"
    };
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
  it("should ignore paste errors", () => {
    log.get.mockResolvedValue("log content");
    paste.mockRejectedValue("some paste error");
    jest
      .spyOn(reporter, "sendOpenCutsRun")
      .mockRejectedValueOnce("some paste error");
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
      const mainWindow = jest.fn();
      prompt.mockClear();
      prompt.mockResolvedValue({});
      return reporter.report(result, null, mainWindow).then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog with err msg`, () => {
      const mainWindow = jest.fn();
      prompt.mockClear();
      prompt.mockResolvedValue({});
      return reporter.report(result, "some error", mainWindow).then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog and survive if closed`, () => {
      const mainWindow = jest.fn();
      prompt.mockClear();
      prompt.mockResolvedValue();
      return reporter.report(result, null, mainWindow).then(() => {
        expect(prompt).toHaveBeenCalledTimes(1);
      });
    });
    it(`should show ${result} report dialog and survive error`, () => {
      const mainWindow = jest.fn();
      prompt.mockClear();
      prompt.mockRejectedValue("some error");
      return reporter.report(result, null, mainWindow);
    });
  });
});

describe("tokenDialog()", () => {
  it("should show token dialog and set value", () => {
    const mainWindow = jest.fn();
    prompt.mockClear();
    prompt.mockResolvedValue({ token: "asdf" });
    return reporter.tokenDialog(mainWindow).then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledWith("opencuts_token", "asdf");
    });
  });
  it("should fail silently if token unset", () => {
    const mainWindow = jest.fn();
    prompt.mockClear();
    settings.set.mockClear();
    prompt.mockRejectedValue("some error");
    return reporter.tokenDialog(mainWindow).then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(0);
    });
  });
  it("should fail silently on prompt error", () => {
    const mainWindow = jest.fn();
    prompt.mockClear();
    settings.set.mockClear();
    prompt.mockResolvedValue({ unxpected: "value" });
    return reporter.tokenDialog(mainWindow).then(() => {
      expect(prompt).toHaveBeenCalledTimes(1);
      expect(settings.set).toHaveBeenCalledTimes(0);
    });
  });
});
