const mainEvent = { emit: jest.fn() };
const log = { warn: jest.fn() };
const { buildPathForTools } = require("../../helpers/fileutil.js");

beforeEach(() => {
  mainEvent.emit.mockReset();
  log.warn.mockReset();
});

const heimdallPlugin = new (require("./plugin.js"))(
  { config: { codename: "herolte" } },
  "a",
  mainEvent,
  log
);

describe("heimdall plugin", () => {
  describe("flash()", () => {
    it("should flash", () => {
      jest.spyOn(heimdallPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(heimdallPlugin.heimdall, "flash")
        .mockImplementation(partitions => Promise.resolve());
      return heimdallPlugin
        .action__flash({
          partitions: [
            {
              partition: "BOOT",
              file: "boot-reboot-recovery-herolte.img",
              group: "firmware"
            }
          ]
        })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(heimdallPlugin.event.emit).toHaveBeenCalledTimes(3);
          expect(heimdallPlugin.heimdall.flash).toHaveBeenCalledTimes(1);
          heimdallPlugin.event.emit.mockRestore();
          heimdallPlugin.heimdall.flash.mockRestore();
        });
    });
    it("should properly escape paths", () => {
      jest.spyOn(heimdallPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(heimdallPlugin.heimdall, "flash")
        .mockImplementation(partitions => Promise.resolve());
      return heimdallPlugin
        .action__flash({
          partitions: [
            {
              partition: "BOOT",
              file: "sub directory/boot-reboot-recovery-herolte.img",
              group: "Ubuntu Touch"
            }
          ]
        })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(heimdallPlugin.event.emit).toHaveBeenCalledTimes(3);
          expect(heimdallPlugin.heimdall.flash).toHaveBeenCalledTimes(1);
          expect(heimdallPlugin.heimdall.flash).toHaveBeenCalledWith([
            {
              file: buildPathForTools(
                heimdallPlugin.cachePath,
                heimdallPlugin.props.config.codename,
                "Ubuntu Touch",
                "sub directory/boot-reboot-recovery-herolte.img"
              ),
              group: "Ubuntu Touch",
              partition: "BOOT"
            }
          ]);
          heimdallPlugin.event.emit.mockRestore();
          heimdallPlugin.heimdall.flash.mockRestore();
        });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(heimdallPlugin.heimdall, "wait").mockResolvedValue();
      return heimdallPlugin.wait().then(r => {
        expect(r).toEqual("Unknown");
        expect(heimdallPlugin.heimdall.wait).toHaveBeenCalledTimes(1);
        heimdallPlugin.heimdall.wait.mockRestore();
      });
    });
  });
  describe("init()", () => {
    it("should execute Heimdall", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.resolve());
      return heimdallPlugin.init().then(r => {
        expect(r).toEqual(true);
        expect(hasAccess).toHaveBeenCalledTimes(1);
      });
    });
    it("should emit user:no-msvc2012x86 when heimdall fails with dll error", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() =>
          Promise.reject(new Error('{"error": {"code": 3221225781}}'))
        );
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return heimdallPlugin.init().then(() => {
        expect(mainEvent.emit).toHaveBeenCalledTimes(1);
        expect(mainEvent.emit).toHaveBeenCalledWith("user:no-msvc2012x86");
      });
    });
    it("should throw when heimdall throws a json error", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.reject(new Error('{"error": {}}')));
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return expect(heimdallPlugin.init()).rejects.toThrow('{"error": {}}');
    });
    it("should throw and log a warning when heimdall throws a non-json error somehow", () => {
      const hasAccess = jest
        .spyOn(heimdallPlugin.heimdall, "hasAccess")
        .mockImplementation(() => Promise.reject(new Error("¯\\_(ツ)_/¯")));
      jest.spyOn(heimdallPlugin.log, "warn").mockImplementation(() => null);
      return expect(heimdallPlugin.init())
        .rejects.toThrow("¯\\_(ツ)_/¯")
        .then(() => expect(log.warn).toHaveBeenCalledTimes(1));
    });
  });
});
