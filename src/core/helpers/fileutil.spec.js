const path = require("path");
const fileutil = require("./fileutil.js");

describe("buildPathForTools()", () => {
  it("should return normal path", () => {
    const builtPath = fileutil.buildPathForTools(
      "cache",
      "axolotl",
      "firmware",
      "modem.img"
    );
    const expectedPath = "cache/axolotl/firmware/modem.img".replaceAll(
      "/",
      path.sep
    );
    expect(builtPath).toEqual(expectedPath);
  });
  it("should path with whitespaces within items", () => {
    const builtPath = fileutil.buildPathForTools(
      "cache   directory",
      "otter",
      "Ubuntu Touch",
      "update file.zip"
    );
    const expectedPath =
      "cache   directory/otter/Ubuntu Touch/update file.zip".replaceAll(
        "/",
        path.sep
      );
    expect(builtPath).toEqual(expectedPath);
  });
  it("should path with whitespaces around items", () => {
    const builtPath = fileutil.buildPathForTools(
      "  cache  ",
      "  otter  ",
      "  UbuntuTouch  ",
      "  update.zip  "
    );
    const expectedPath =
      "  cache  /  otter  /  UbuntuTouch  /  update.zip  ".replaceAll(
        "/",
        path.sep
      );
    expect(builtPath).toEqual(expectedPath);
  });

  it("should path with whitespaces within and around items", () => {
    const builtPath = fileutil.buildPathForTools(
      "  cache   directory  ",
      "FP5",
      "  Ubuntu Touch  ",
      "  update file.zip   "
    );
    const expectedPath =
      "  cache   directory  /FP5/  Ubuntu Touch  /  update file.zip   ".replaceAll(
        "/",
        path.sep
      );
    expect(builtPath).toEqual(expectedPath);
  });
});
