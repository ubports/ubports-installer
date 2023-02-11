process.argv = [null, null, "-vv"];
const api = require("./api.js");
jest.mock("./api.js");
api.getImages.mockResolvedValue({
  files: [{ url: "a/s/d/f" }],
  commands: "here be dragons"
});
const systemimage = new (require("./plugin.js"))({
  os: { name: "Ubuntu Touch" },
  config: { codename: "bacon" },
  settings: { channel: "ubports-touch/16.04/stable" }
});

systemimage.settings = {
  get: jest.fn()
};

beforeEach(() => jest.clearAllMocks());

describe("systemimage plugin", () => {
  describe("actions", () => {
    describe("install", () => {
      it("should create install actions", () =>
        systemimage.action__install(null).then(r => {
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
      it("should verify recovery", () =>
        systemimage.action__install({ verify_recovery: true }).then(r => {
          expect(r).toHaveLength(1);
          expect(r[0].actions).toHaveLength(6);
          expect(r[0].actions).toContainEqual({
            "adb:assert_prop": { prop: "ro.ubuntu.recovery", value: "true" }
          });
        }));
    });
  });
  describe("remote_values", () => {
    describe("channels", () => {
      it("should resolve channels", () => {
        systemimage.settings.get.mockReturnValueOnce(false);
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "16.04/stable",
            value: "ubports-touch/16.04/stable"
          },
          {
            hidden: true,
            label: "17.04/stable",
            value: "17.04/stable"
          }
        ]);
        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            { label: "16.04/stable", value: "ubports-touch/16.04/stable" }
          ]);
          expect(systemimage.settings.get).toHaveBeenCalledTimes(1);
        });
      });
      it("should resolve channels including hidden channels if set", () => {
        systemimage.settings.get.mockReturnValueOnce(true);
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "16.04/stable",
            value: "ubports-touch/16.04/stable"
          },
          {
            hidden: true,
            label: "17.04/stable",
            value: "17.04/stable"
          }
        ]);
        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            { label: "16.04/stable", value: "ubports-touch/16.04/stable" },
            { label: "--- hidden channels ---", disabled: true },
            { label: "17.04/stable", value: "17.04/stable" }
          ]);
          expect(systemimage.settings.get).toHaveBeenCalledTimes(1);
        });
      });
      it("should not include hidden channels separator if none specified", () => {
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "16.04/stable",
            value: "ubports-touch/16.04/stable"
          }
        ]);
        systemimage
          .remote_values__channels()
          .then(r =>
            expect(r).toEqual([
              { label: "16.04/stable", value: "ubports-touch/16.04/stable" }
            ])
          );
      });
      it("should sort the channels based on stability", async () => {
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "20.04/rc",
            value: "20.04/arm64/android9plus/rc"
          },
          {
            hidden: false,
            label: "16.04/stable",
            value: "16.04/arm64/android9/stable"
          },
          {
            hidden: false,
            label: "16.04/rc",
            value: "16.04/arm64/android9/rc"
          }
        ]);

        const res = await systemimage.remote_values__channels();
        expect(res).toEqual([
          { label: "16.04/stable", value: "16.04/arm64/android9/stable" },
          { label: "16.04/rc", value: "16.04/arm64/android9/rc" },
          { label: "20.04/rc", value: "20.04/arm64/android9plus/rc" }
        ]);
      });
      it("should rename labels when they are equal to values", async () => {
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "20.04/arm64/android9plus/rc",
            value: "20.04/arm64/android9plus/rc"
          },
          {
            hidden: false,
            label: "16.04/arm64/android9/stable",
            value: "16.04/arm64/android9/stable"
          },
          {
            hidden: false,
            label: "16.04/arm64/android9/rc",
            value: "16.04/arm64/android9/rc"
          }
        ]);

        const res = await systemimage.remote_values__channels();
        expect(res).toEqual([
          { label: "16.04/stable", value: "16.04/arm64/android9/stable" },
          { label: "16.04/rc", value: "16.04/arm64/android9/rc" },
          { label: "20.04/rc", value: "20.04/arm64/android9plus/rc" }
        ]);
      });
      it("should sort higher stable versions first", async () => {
        api.getChannels.mockResolvedValueOnce([
          {
            hidden: false,
            label: "16.04/arm64/android9/stable",
            value: "16.04/arm64/android9/stable"
          },
          {
            hidden: false,
            label: "16.04/arm64/android9/rc",
            value: "16.04/arm64/android9/rc"
          },
          {
            hidden: false,
            label: "20.04/arm64/android9plus/rc",
            value: "20.04/arm64/android9plus/rc"
          },
          {
            hidden: false,
            label: "20.04/arm64/android9plus/stable",
            value: "20.04/arm64/android9plus/stable"
          }
        ]);

        const res = await systemimage.remote_values__channels();
        expect(res).toEqual([
          { label: "20.04/stable", value: "20.04/arm64/android9plus/stable" },
          { label: "20.04/rc", value: "20.04/arm64/android9plus/rc" },
          { label: "16.04/stable", value: "16.04/arm64/android9/stable" },
          { label: "16.04/rc", value: "16.04/arm64/android9/rc" }
        ]);
      });
    });
  });
});
