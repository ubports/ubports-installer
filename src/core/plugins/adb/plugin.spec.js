const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());
const log = require("../../../lib/log.js");
jest.mock("../../../lib/log.js");

const adbPlugin = new (require("./plugin.js"))(
  { config: { codename: "bacon" } },
  "a",
  mainEvent,
  log
);

describe("adb plugin", () => {
  describe("init()", () => {
    it("should start server", () => {
      jest.spyOn(adbPlugin.adb, "startServer").mockResolvedValue();
      return adbPlugin.init().then(() => {
        expect(adbPlugin.adb.startServer).toHaveBeenCalledTimes(1);
        adbPlugin.adb.startServer.mockRestore();
      });
    });
  });
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(adbPlugin.adb, "kill").mockResolvedValue();
      return adbPlugin.kill().then(() => {
        expect(adbPlugin.adb.kill).toHaveBeenCalledTimes(1);
        adbPlugin.adb.kill.mockRestore();
      });
    });
  });
  describe("wait()", () => {
    it("should wait", () => {
      jest.spyOn(adbPlugin.adb, "wait").mockResolvedValue();
      jest.spyOn(adbPlugin.adb, "getDeviceName").mockResolvedValue();
      return adbPlugin.wait().then(() => {
        expect(adbPlugin.adb.wait).toHaveBeenCalledTimes(1);
        expect(adbPlugin.adb.getDeviceName).toHaveBeenCalledTimes(1);
        adbPlugin.adb.wait.mockRestore();
        adbPlugin.adb.getDeviceName.mockRestore();
      });
    });
  });

  describe("action__format()", () => {
    it("should format partition", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest.spyOn(adbPlugin.adb, "wait").mockResolvedValueOnce();
      jest.spyOn(adbPlugin.adb, "format").mockResolvedValueOnce();
      return adbPlugin.action__format({ partition: "cache" }).then(r => {
        expect(r).toEqual(null);
        expect(adbPlugin.event.emit).toHaveBeenCalledTimes(3);
        expect(adbPlugin.adb.wait).toHaveBeenCalledTimes(1);
        expect(adbPlugin.adb.format).toHaveBeenCalledTimes(1);
        expect(adbPlugin.adb.format).toHaveBeenCalledWith("cache");
        adbPlugin.event.emit.mockRestore();
        adbPlugin.adb.wait.mockRestore();
        adbPlugin.adb.format.mockRestore();
      });
    });
  });

  describe("action__sideload()", () => {
    it("should run sideload image", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(adbPlugin.adb, "sideload")
        .mockImplementation((path, cb) => Promise.resolve(cb(1)));
      return adbPlugin
        .action__sideload({ group: "Ubuntu Touch", file: "main.zip" })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(adbPlugin.event.emit).toHaveBeenCalledTimes(5);
          expect(adbPlugin.adb.sideload).toHaveBeenCalledTimes(1);
          adbPlugin.event.emit.mockRestore();
          adbPlugin.adb.sideload.mockRestore();
        });
    });
  });

  describe("action__push()", () => {
    it("should run push files", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(adbPlugin.adb, "push")
        .mockImplementation((files, dest, cb) => Promise.resolve(cb(1)));
      return adbPlugin
        .action__push({
          group: "Ubuntu Touch",
          files: ["main.zip"],
          dest: "asdf"
        })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(adbPlugin.event.emit).toHaveBeenCalledTimes(5);
          expect(adbPlugin.adb.push).toHaveBeenCalledTimes(1);
          adbPlugin.event.emit.mockRestore();
          adbPlugin.adb.push.mockRestore();
        });
    });
  });

  describe("action__shell()", () => {
    it("should run shell command", () => {
      jest.spyOn(adbPlugin.adb, "shell").mockResolvedValueOnce();
      return adbPlugin
        .action__shell({ args: ["echo", "hello", "world"] })
        .then(r => {
          expect(r).toEqual(null);
          expect(adbPlugin.adb.shell).toHaveBeenCalledTimes(1);
          expect(adbPlugin.adb.shell).toHaveBeenCalledWith(
            "echo",
            "hello",
            "world"
          );
          adbPlugin.adb.shell.mockRestore();
        });
    });
  });

  describe("action__reboot()", () => {
    it("should reboot", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest.spyOn(adbPlugin.adb, "reboot").mockResolvedValueOnce();
      return adbPlugin.action__reboot({ to_state: "recovery" }).then(r => {
        expect(r).toEqual(undefined);
        expect(adbPlugin.event.emit).toHaveBeenCalledTimes(3);
        expect(adbPlugin.adb.reboot).toHaveBeenCalledTimes(1);
        expect(adbPlugin.adb.reboot).toHaveBeenCalledWith("recovery");
        adbPlugin.adb.reboot.mockRestore();
      });
    });
  });
});
