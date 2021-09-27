process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const packageInfo = require("../../package.json");
jest.mock("../../package.json");
packageInfo.version = "0.8.9-beta";

const updater = require("./updater.js");

it("should be a singleton", () => {
  expect(require("./updater.js")).toBe(require("./updater.js"));
});

describe("getLatestVersion()", () => {
  afterEach(() => {
    updater.cache = {};
  });
  it("should return version string", () => {
    const version_string = "0.8.8-beta";
    axios.get.mockResolvedValueOnce({ data: { tag_name: version_string } });
    expect(updater.getLatestVersion()).resolves.toEqual(version_string);
  });
  it("should return correct error", () => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    expect.assertions(1);
    return updater.getLatestVersion().catch(e => {
      expect(e.message).toMatch(
        "Failed to get latest version of the UBports Installer"
      );
    });
  });
});

describe("isOutdated()", () => {
  afterEach(() => {
    updater.cache = {};
  });
  it("outdated returns updateUrl", () => {
    updater.cache = { latest: "0.9.0-beta" };
    return expect(updater.isOutdated()).resolves.toEqual(updater.updateUrl);
  });

  it("not outdated returns null", () => {
    updater.cache = { latest: "0.7.0-beta" };
    return expect(updater.isOutdated()).resolves.toBeNull();
  });
});

describe("isPrerelease()", () => {
  afterEach(() => {
    updater.cache = {};
  });
  it("pre-release returns null", () => {
    updater.cache = { latest: "0.9.0-beta" };
    return expect(updater.isPrerelease()).resolves.toBeNull();
  });

  it("not ore-release returns updateUrl", () => {
    updater.cache = { latest: "0.7.0-beta" };
    return expect(updater.isPrerelease()).resolves.toEqual(updater.updateUrl);
  });
});
