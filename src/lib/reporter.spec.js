process.argv = [null, null, "-vv"];
const log = require("./log.js");
jest.mock("./log.js");
const { paste } = require("./paste.js");
jest.mock("./paste.js");
const cli = require("./cli.js");
jest.mock("./cli.js");
const settings = require("./settings.js");
const core = require("../core/core.js");
jest.mock("../core/core.js");
const { prompt } = require("./prompt.js");
jest.mock("./prompt.js");
const { OpenCutsReporter } = require("open-cuts-reporter");
jest.mock("open-cuts-reporter");
const { osInfo } = require("systeminformation");
jest.mock("systeminformation");

const reporter = require("./reporter.js");

it("should be a singleton", () => {
  expect(require("./reporter.js")).toBe(require("./reporter.js"));
});

beforeEach(() => jest.clearAllMocks());

describe("getEnvironment()", () => {
  it("should resolve environment string", () => {
    return reporter
      .getEnvironment()
      .then(r =>
        expect(r).toEqual(
          `distro release codename platform kernel arch build servicepack NodeJS ${process.version}`
        )
      );
  });
  it("should resolve platform on error", () => {
    osInfo.mockRejectedValueOnce("oh no");
    return reporter
      .getEnvironment()
      .then(r => expect(r).toEqual(process.platform));
  });
});

describe("getDeviceLinkMarkdown()", () => {
  it("should return default", () => {
    expect(reporter.getDeviceLinkMarkdown()).toEqual("(not device dependent)");
  });
  it("should return codename", () => {
    expect(reporter.getDeviceLinkMarkdown("a")).toEqual("`a`");
  });
  it("should mention cli", () => {
    cli.file = "/tmp";
    expect(reporter.getDeviceLinkMarkdown("a")).toEqual(
      "`a` with local config file"
    );
    delete cli.file;
  });
  it("should assemble markdown", () => {
    core.props = {
      config: {
        codename: "bacon",
        name: "Oneplus One"
      },
      os: {
        name: "SomeOS"
      }
    };
    expect(reporter.getDeviceLinkMarkdown("something")).toEqual(
      "[`bacon`](https://github.com/ubports/installer-configs/blob/master/v2/devices/bacon.yml) (Oneplus One)"
    );
  });
  it("should assemble markdown with device page link for UT", () => {
    core.props = {
      config: {
        codename: "bacon",
        name: "Oneplus One"
      },
      os: {
        name: "Ubuntu Touch"
      }
    };
    expect(reporter.getDeviceLinkMarkdown("something")).toEqual(
      "[`bacon`](https://github.com/ubports/installer-configs/blob/master/v2/devices/bacon.yml) ([Oneplus One](https://devices.ubuntu-touch.io/device/bacon/))"
    );
  });
});

describe("getDebugInfo()", () => {
  it("should resolve debug without error", () => {
    return reporter
      .getDebugInfo({ error: "Everything exploded" })
      .then(decodeURIComponent)
      .then(r =>
        expect(r).toContain("**Error:**\n```\nEverything exploded\n```")
      );
  });
  it("should resolve debug without error on unknown", () => {
    return reporter
      .getDebugInfo({ error: "Unknown Error" })
      .then(decodeURIComponent)
      .then(r => expect(r).not.toContain("**Error:**"));
  });
  it("should resolve debug without error on null", () => {
    return reporter
      .getDebugInfo({})
      .then(decodeURIComponent)
      .then(r => expect(r).not.toContain("**Error:**"));
  });
});

describe("prepareErrorReport()", () => {
  it("should return error report object", () => {
    return reporter.prepareErrorReport().then(r => expect(r).toBeDefined);
  });
});

describe("prepareSuccessReport()", () => {
  it("should return success report object", () => {
    return reporter.prepareSuccessReport().then(r => expect(r).toBeDefined);
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
    return reporter
      .sendOpenCutsRun(null, {
        result: "PASS"
      })
      .then(r => expect(r).toEqual(undefined));
  });
});

describe("report()", () => {
  ["PASS", "WONKY", "FAIL"].forEach(result => {
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
