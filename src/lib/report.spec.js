const log = require("./log.js");
jest.mock("./log.js");
const { OpenCutsReporter } = require("open-cuts-reporter");
jest.mock("open-cuts-reporter");
const { paste } = require("ubuntu-pastebin");
jest.mock("ubuntu-pastebin");

const {
  sendOpenCutsRun,
  sendBugReport,
  prepareSuccessReport,
  prepareErrorReport
} = require("./report.js");

describe("prepareErrorReport()", () => {
  it("should return error report object", () => {
    global.installProperties = { device: undefined };
    expect(prepareErrorReport()).resolves.toBeDefined();
  });
});

describe("prepareSuccessReport()", () => {
  it("should return success report object", () => {
    global.installProperties = {
      device: "bacon"
    };
    expect(prepareSuccessReport()).resolves.toBeDefined();
  });
});

describe("sendBugReport()", () => {
  it("should send bug report", () => {
    log.get.mockResolvedValue("log content");
    expect(
      sendBugReport({
        title: "wasd"
      })
    ).resolves.toEqual(undefined);
  });
});

describe("sendOpenCutsRun()", () => {
  it("should send open-cuts run", () => {
    log.get.mockResolvedValue("log content");
    expect(
      sendOpenCutsRun(null, {
        result: "PASS"
      })
    ).resolves.toEqual(undefined);
  });
});
