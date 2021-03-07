const api = require("./api.js");
jest.mock("./api.js");
api.getImages.mockResolvedValue({
  files: [{ url: "a/s/d/f" }],
  commands: "here be dragons"
});
api.getChannels.mockResolvedValue([
  "ubports-touch/16.04/devel",
  "ubports-touch/16.04/stable"
]);
const systemimage = new (require("./plugin.js"))({
  os: { name: "Ubuntu Touch" },
  config: { codename: "bacon" },
  settings: { channel: "ubports-touch/16.04/stable" }
});

describe("systemimage plugin", () => {
  describe("actions", () => {
    describe("download", () => {
      it("should create download steps", () =>
        systemimage.action__install().then(r => {
          expect(r).toHaveLength(1);
          expect(r[0].actions).toHaveLength(5);
          expect(r[0].actions).toContainEqual({
            "core:download": {
              files: [{ url: "a/s/d/f" }],
              group: "Ubuntu Touch"
            }
          });
          expect(r[0].actions).toContainEqual({
            "core:write": {
              content: "here be dragons",
              file: "ubuntu_command",
              group: "Ubuntu Touch"
            }
          });
          expect(r[0].actions).toContainEqual({ "adb:wait": null });
          expect(r[0].actions).toContainEqual({
            "adb:preparesystemimage": null
          });
          expect(r[0].actions).toContainEqual({
            "adb:push": {
              dest: "/cache/recovery/",
              files: ["f", "ubuntu_command"],
              group: "Ubuntu Touch"
            }
          });
        }));
    });
  });
  describe("remote_values", () => {
    describe("channels", () => {
      it("should resolve channels", () =>
        systemimage.remote_values__channels().then(r =>
          expect(r).toEqual([
            { label: "16.04/stable", value: "ubports-touch/16.04/stable" },
            { label: "16.04/devel", value: "ubports-touch/16.04/devel" }
          ])
        ));
    });
  });
});
