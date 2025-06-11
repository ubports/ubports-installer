process.argv = [null, null, "-vv"];
const packageInfo = require("../../../package.json");
jest.mock("../../../package.json");
packageInfo.package = null;

const asarLibs = require("./asarLibs.js");

const libs = ["DeviceTools"];

libs.forEach(lib =>
  it(`should export ${lib}`, () => expect(asarLibs[lib]).toBeDefined())
);
describe("asarLibPathHack", () => {
  ["foo", "bar"].forEach(m => {
    it("should export module as-is for unpacked", () => {
      packageInfo.package = null;
      expect(asarLibs.asarLibPathHack(m)).toEqual(m);
    });
    it("should export unpacked path as-is for package", () => {
      packageInfo.package = "deb";
      expect(asarLibs.asarLibPathHack(m)).not.toEqual(m);
    });
  });
});
