process.argv = [null, null, "-vv"];
const api = require("./api.js");
jest.mock("./api.js");
api.getImages.mockResolvedValue({
  files: [{ url: "a/s/d/f" }],
  commands: "here be dragons"
});
api.getMetarelease.mockResolvedValue([{
  series: "16.04",
  supportStatus: "end-of-life",
  systemImageChannels: {
    "16.04/arm64/android9plus/devel": { variant: "arm64/android9plus", stability: "daily" },
    "16.04/arm64/android9plus/rc": { variant: "arm64/android9plus", stability: "rc" },
    "16.04/arm64/android9plus/stable": { variant: "arm64/android9plus", stability: "stable" },
  }
},{
  series: "20.04",
  supportStatus: "supported",
  systemImageChannels: {
    "20.04/arm64/android9plus/devel": { variant: "arm64/android9plus", stability: "daily" },
    "20.04/arm64/android9plus/rc": { variant: "arm64/android9plus", stability: "rc" },
    "20.04/arm64/android9plus/stable": { variant: "arm64/android9plus", stability: "stable" },
  },
},{
  series: "24.04-1.x",
  supportStatus: "supported",
  systemImageChannels: {
    "24.04-1.x/arm64/android9plus/daily": { variant: "arm64/android9plus", stability: "daily" },
    "24.04-1.x/arm64/android9plus/rc": { variant: "arm64/android9plus", stability: "rc" },
    "24.04-1.x/arm64/android9plus/stable": { variant: "arm64/android9plus", stability: "stable" },
  },
},{
  series: "24.04-2.x",
  supportStatus: "development",
  systemImageChannels: {
    "24.04-2.x/arm64/android9plus/daily": { variant: "arm64/android9plus", stability: "daily" },
    "24.04-2.x/arm64/android9plus/rc": { variant: "arm64/android9plus", stability: "rc" },
  },
},{
  series: "26.04-1.x",
  supportStatus: "development",
  systemImageChannels: {
    "26.04-1.x/arm64/android9plus/daily": { variant: "arm64/android9plus", stability: "daily" },
  },
}]);
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
      function mockSettings(showDevel, showEol, showHidden) {
        const settings = {
          "systemimage.showDevelopmentReleases": showDevel,
          "systemimage.showEolReleases": showEol,
          "systemimage.showHiddenChannels": showHidden,
        };

        systemimage.settings.get.mockImplementation((key) => settings[key]);
      }

      it("should group channels by series", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should hide development and end-of-life releases by default", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should show development releases if asked", () => {
        mockSettings(true, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            }), expect.objectContaining({
              label: "24.04-2.x (Development release)",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-2.x Daily builds",
                  value: "24.04-2.x/arm64/android9plus/daily",
                })
              ]
            })
          ]);
        });
      });

      it("should show development releases if there's no supported release", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "24.04-2.x (Development release)",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-2.x Daily builds",
                  value: "24.04-2.x/arm64/android9plus/daily",
                })
              ]
            })
          ]);
        });
      });

      it("should show EoL'ed releases if asked", () => {
        mockSettings(false, true, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            }), expect.objectContaining({
              label: "16.04 (End-of-life)",
              grouped_values: [
                expect.objectContaining({
                  label: "16.04 Development",
                  value: "16.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should show EoL'ed releases if there's no other releases", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "16.04 (End-of-life)",
              grouped_values: [
                expect.objectContaining({
                  label: "16.04 Development",
                  value: "16.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should show supported releases before development releases, before EoL'ed releases", () => {
        mockSettings(true, true, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "16.04/arm64/android9plus/devel", hidden: false },
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            }), expect.objectContaining({
              label: "24.04-2.x (Development release)",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-2.x Daily builds",
                  value: "24.04-2.x/arm64/android9plus/daily",
                })
              ]
            }), expect.objectContaining({
              label: "16.04 (End-of-life)",
              grouped_values: [
                expect.objectContaining({
                  label: "16.04 Development",
                  value: "16.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should sort newer supported releases first", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-1.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "24.04-1.x (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-1.x Daily builds",
                  value: "24.04-1.x/arm64/android9plus/daily",
                })
              ]
            }), expect.objectContaining({
              label: "20.04",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should sort older (nearing release) development releases first", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "26.04-1.x/arm64/android9plus/daily", hidden: false },
          { value: "24.04-2.x/arm64/android9plus/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "24.04-2.x (Development release)",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-2.x Daily builds",
                  value: "24.04-2.x/arm64/android9plus/daily",
                })
              ]
            }), expect.objectContaining({
              label: "26.04-1.x (Development release)",
              grouped_values: [
                expect.objectContaining({
                  label: "26.04-1.x Daily builds",
                  value: "26.04-1.x/arm64/android9plus/daily",
                })
              ]
            })
          ]);
        });
      });
  
      it("should hide hidden channels by default", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-1.x/arm64/android9plus/daily", hidden: true },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });

      it("should show hidden channels separately if asked", () => {
        mockSettings(false, false, true);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-1.x/arm64/android9plus/daily", hidden: true },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            }), expect.objectContaining({
              label: "Others/hidden channels",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-1.x Daily builds",
                  value: "24.04-1.x/arm64/android9plus/daily",
                })
              ]
            })
          ]);
        });
      });

      it("should show unknown channels separately without asking", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "24.04-1.x/experiment_mir2/daily", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            }), expect.objectContaining({
              label: "Others/hidden channels",
              grouped_values: [
                expect.objectContaining({
                  label: "24.04-1.x/experiment_mir2/daily",
                  value: "24.04-1.x/experiment_mir2/daily",
                })
              ]
            })
          ]);
        });
      });

      it("should sort channels by stability", () => {
        mockSettings(false, false, false);
        api.getChannels.mockResolvedValueOnce([
          { value: "20.04/arm64/android9plus/devel", hidden: false },
          { value: "20.04/arm64/android9plus/rc", hidden: false },
          { value: "20.04/arm64/android9plus/stable", hidden: false },
        ]);

        return systemimage.remote_values__channels().then(r => {
          expect(r).toEqual([
            expect.objectContaining({
              label: "20.04 (Current release)",
              grouped_values: [
                expect.objectContaining({
                  label: "20.04 Stable",
                  value: "20.04/arm64/android9plus/stable",
                }), expect.objectContaining({
                  label: "20.04 Release candidate",
                  value: "20.04/arm64/android9plus/rc",
                }), expect.objectContaining({
                  label: "20.04 Development",
                  value: "20.04/arm64/android9plus/devel",
                })
              ]
            })
          ]);
        });
      });
    });
  });
});
