const api = require("./api.js");
jest.mock("./api.js");
api.getLatestBuild.mockResolvedValue([{ name: "default" }]);
api.getChannels.mockResolvedValue(["1.0", "nightlies"]);
const lineage_os = new (require("./plugin.js"))({
  os: { name: "Lineage OS" },
  config: { codename: "bacon" },
  settings: { channel: "nightlies" }
});

describe("lineage_os plugin", () => {
  describe("actions", () => {
    describe("download", () => {
      it("should create download steps", () =>
        lineage_os.action__download().then(r =>
          expect(r).toEqual([
            {
              actions: [
                {
                  "core:download": {
                    files: [{ name: "default" }],
                    group: "LineageOS"
                  }
                }
              ]
            }
          ])
        ));
    });
    describe("install", () => {
      it("should create install steps", () =>
        lineage_os.action__install().then(r =>
          expect(r).toEqual([
            {
              actions: [
                {
                  "core:download": {
                    group: "LineageOS",
                    files: [{ name: "default" }]
                  }
                },
                {
                  "core:write": {
                    content: "install /data/default",
                    group: "LineageOS",
                    file: "openrecoveryscript"
                  }
                },
                { "adb:wait": null },
                {
                  "adb:push": {
                    group: "LineageOS",
                    files: ["default"],
                    dest: "/data/"
                  }
                },
                {
                  "adb:push": {
                    group: "LineageOS",
                    files: ["openrecoveryscript"],
                    dest: "/cache/recovery/"
                  }
                }
              ]
            }
          ])
        ));
    });
  });
  describe("remote_values", () => {
    describe("channels", () => {
      it("should resolve channels", () =>
        lineage_os.remote_values__channels().then(r =>
          expect(r).toEqual([
            { label: "1.0", value: "1.0" },
            { label: "nightlies", value: "nightlies" }
          ])
        ));
    });
  });
});
