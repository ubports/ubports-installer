const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());
const log = require("../../../lib/log.js");
jest.mock("../../../lib/log.js");
const { buildPathForTools } = require("../../helpers/fileutil.js");

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
    it("should properly escape paths", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(adbPlugin.adb, "sideload")
        .mockImplementation((path, cb) => Promise.resolve(cb(1)));
      return adbPlugin
        .action__sideload({ group: "Ubuntu Touch", file: "main update.zip" })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(adbPlugin.event.emit).toHaveBeenCalledTimes(5);
          expect(adbPlugin.adb.sideload).toHaveBeenCalledTimes(1);
          expect(adbPlugin.adb.sideload).toHaveBeenCalledWith(
            buildPathForTools(
              adbPlugin.cachePath,
              adbPlugin.props.config.codename,
              "Ubuntu Touch",
              "main update.zip"
            ),
            expect.any(Function)
          );
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
    it("should properly escape paths", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest
        .spyOn(adbPlugin.adb, "push")
        .mockImplementation((files, dest, cb) => Promise.resolve(cb(1)));
      return adbPlugin
        .action__push({
          group: "Ubuntu Touch",
          files: ["main update.zip"],
          dest: "awesome folder_with weird-formatting  "
        })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(adbPlugin.event.emit).toHaveBeenCalledTimes(5);
          expect(adbPlugin.adb.push).toHaveBeenCalledTimes(1);
          expect(adbPlugin.adb.push).toHaveBeenCalledWith(
            [
              buildPathForTools(
                adbPlugin.cachePath,
                adbPlugin.props.config.codename,
                "Ubuntu Touch",
                "main update.zip"
              )
            ],
            "awesome folder_with weird-formatting  ",
            expect.any(Function)
          );
          adbPlugin.event.emit.mockRestore();
          adbPlugin.adb.push.mockRestore();
        });
    });
  });

  describe("action__shell()", () => {
    const args = ["echo", "hello", "world"];
    [
      { comment: "array", args },
      { comment: "object", args: { args } }
    ].forEach(({ comment, args }) =>
      it(`should run shell command when called with ${comment}`, () => {
        jest.spyOn(adbPlugin.adb, "shell").mockResolvedValueOnce();
        return adbPlugin.action__shell(args).then(r => {
          expect(r).toEqual(null);
          expect(adbPlugin.adb.shell).toHaveBeenCalledTimes(1);
          expect(adbPlugin.adb.shell).toHaveBeenCalledWith(
            "echo",
            "hello",
            "world"
          );
          adbPlugin.adb.shell.mockRestore();
        });
      })
    );
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

  describe("action__reconnect()", () => {
    it("should reconnect", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest.spyOn(adbPlugin.adb, "reconnect").mockResolvedValueOnce();
      return adbPlugin.action__reconnect().then(r => {
        expect(r).toEqual(null);
        expect(adbPlugin.event.emit).toHaveBeenCalledTimes(3);
        expect(adbPlugin.adb.reconnect).toHaveBeenCalledTimes(1);
        adbPlugin.adb.reconnect.mockRestore();
      });
    });
    it("should show connection lost on third failure", () => {
      jest
        .spyOn(adbPlugin.event, "emit")
        .mockImplementation((e, cb) => Promise.resolve(cb(1)));
      jest.spyOn(adbPlugin.adb, "reconnect").mockRejectedValue();
      return adbPlugin.action__reconnect().then(r => {
        expect(r).toHaveLength(1);
        expect(adbPlugin.event.emit).toHaveBeenCalledTimes(2);
        expect(adbPlugin.adb.reconnect).toHaveBeenCalledTimes(2);
        adbPlugin.adb.reconnect.mockRestore();
      });
    });
  });

  describe("action__wait()", () => {
    it("should wait", () => {
      jest.spyOn(adbPlugin.event, "emit").mockReturnValue();
      jest.spyOn(adbPlugin.adb, "wait").mockResolvedValueOnce();
      return adbPlugin.action__wait().then(r => {
        expect(r).toEqual(null);
        expect(adbPlugin.event.emit).toHaveBeenCalledTimes(3);
        expect(adbPlugin.adb.wait).toHaveBeenCalledTimes(1);
        adbPlugin.adb.wait.mockRestore();
      });
    });
  });

  describe("action__assert_prop()", () => {
    [
      {
        comment: "value",
        arg: {
          prop: "somevar",
          value: "asdf"
        }
      },
      {
        comment: "regex w/ flags",
        arg: {
          prop: "somevar",
          regex: {
            pattern: "a[s,d]*f",
            flags: "i"
          }
        }
      },
      {
        comment: "regex w/o flags",
        arg: {
          prop: "somevar",
          regex: {
            pattern: "a[s,d]*f"
          }
        }
      },
      {
        comment: "string in regex",
        arg: {
          prop: "somevar",
          regex: {
            pattern: "asdf"
          }
        }
      }
    ].forEach(({ comment, arg }) => {
      it(`should assert and pass prop from ${comment}`, () => {
        jest.spyOn(adbPlugin.adb, "getprop").mockResolvedValue("asdf");
        return adbPlugin.action__assert_prop(arg).then(r => {
          expect(r).not.toBeDefined();
          expect(adbPlugin.adb.getprop).toHaveBeenCalledWith(arg.prop);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching(/Asserting .* property/)
          );
          adbPlugin.adb.getprop.mockRestore();
        });
      });
      it(`should assert and fail prop from ${comment}`, done => {
        jest.spyOn(adbPlugin.adb, "getprop").mockResolvedValue("wasd");
        adbPlugin.action__assert_prop(arg).catch(e => {
          expect(e.message).toMatch(
            /Assertion error: expected property .* to (be|match) .* but got wasd/
          );
          expect(adbPlugin.adb.getprop).toHaveBeenCalledWith(arg.prop);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            expect.stringMatching(/Asserting .* property/)
          );
          adbPlugin.adb.getprop.mockRestore();
          done();
        });
      });
    });
  });
});
