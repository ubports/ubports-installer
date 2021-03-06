const mainEvent = { emit: jest.fn() };
const log = { error: jest.fn(), debug: jest.fn(), info: jest.fn() };
beforeEach(() => {
  mainEvent.emit.mockReset();
  log.error.mockReset();
  log.debug.mockReset();
  log.info.mockReset();
});

const { download, checkFile } = require("progressive-downloader");
const { writeFile } = require("fs-extra");
const core = new (require("./plugin.js"))(
  {
    os: { name: "Ubuntu Touch" },
    config: { codename: "yggdrasil" }
  },
  "a",
  mainEvent,
  log
);

describe("core plugin", () => {
  describe("action__end()", () => {
    it("should display end screen", () => {
      return core.action__end().then(r => {
        expect(r).toEqual(undefined);
        expect(mainEvent.emit).toHaveBeenCalledWith("user:write:done");
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:status",
          "Ubuntu Touch successfully installed!",
          false
        );
        expect(mainEvent.emit).toHaveBeenCalledWith(
          "user:write:under",
          "All done! Enjoy exploring your new OS!"
        );
        expect(mainEvent.emit).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("action__info()", () => {
    it("should display info", () =>
      core
        .action__info({
          status: "this is a status",
          info: "important details",
          dots: true,
          speed: 10,
          progress: 0.33
        })
        .then(r => {
          expect(r).toEqual(undefined);
          expect(mainEvent.emit).toHaveBeenCalledWith("user:write:speed", 10);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:progress",
            33
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            "this is a status",
            true
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            "important details"
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(4);
        }));
    it("should hide irrellevant stuff", () =>
      core.action__info({}).then(r => {
        expect(r).toEqual(undefined);
        expect(mainEvent.emit).toHaveBeenCalledWith("user:write:speed", false);
        expect(mainEvent.emit).toHaveBeenCalledWith("user:write:progress", 0);
        expect(mainEvent.emit).toHaveBeenCalledTimes(2);
      }));
  });

  describe("action__group()", () => {
    it("should resolve group steps", () =>
      core.action__group([{}]).then(r => expect(r).toEqual([{}])));
    it("should resolve null on empty array", () =>
      core.action__group([]).then(r => expect(r).toEqual(null)));
  });

  describe("action__user_action()", () => {
    [
      [{ action: "unlock" }, { unlock: { foo: "bar" } }, undefined],
      [
        { action: "recovery" },
        { recovery: { foo: "bar" } },
        [{ actions: [{ "adb:wait": null }] }]
      ],
      [
        { action: "system" },
        { system: { foo: "bar" } },
        [{ actions: [{ "adb:wait": null }] }]
      ],
      [
        { action: "bootloader" },
        { bootloader: { foo: "bar" } },
        [{ actions: [{ "fastboot:wait": null }] }]
      ],
      [
        { action: "download" },
        { download: { foo: "bar" } },
        [{ actions: [{ "heimdall:wait": null }] }]
      ]
    ].forEach(([action, user_actions, substeps]) =>
      it(`should run user_action ${action.action}`, () => {
        mainEvent.emit.mockImplementation((m, d, cb) => cb());
        core.props.config.user_actions = user_actions;
        return core.action__user_action(action).then(r => {
          expect(r).toEqual(substeps);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:action",
            { foo: "bar" },
            expect.any(Function)
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(1);
        });
      })
    );
    it("should reject on unknown user_action", done => {
      core.props.config.user_actions = {};
      core.action__user_action({ action: "a" }).catch(e => {
        expect(e.message).toEqual("Unknown user_action: a");
        done();
      });
    });
  });

  describe("action__download()", () => {
    it("should download", () =>
      core.action__download({
        group: "fimrware",
        files: [
          { url: "a/c", checksum: { sum: "b", algorithm: "sha256" } },
          { url: "a/b", checksum: { sum: "a", algorithm: "sha256" } }
        ]
      })); // TODO add assertions for event messages
    it("should show network error", done => {
      download.mockRejectedValueOnce("download error");
      core
        .action__download({
          group: "firmware",
          files: [
            { url: "a/c", checksum: { sum: "b", algorithm: "sha256" } },
            { url: "a/b", checksum: { sum: "a", algorithm: "sha256" } }
          ]
        })
        .catch(error => {
          expect(error.message).toEqual("core:download download error");
          expect(mainEvent.emit).toHaveBeenCalledWith("user:no-network");
          expect(mainEvent.emit).toHaveBeenCalledTimes(1);
          done();
        });
    });
  });

  describe("action__write()", () => {
    it("should write file", () =>
      core
        .action__write({
          group: "Ubuntu Touch",
          file: "testfile",
          content: "asdf"
        })
        .then(() =>
          expect(writeFile).toHaveBeenCalledWith(
            expect.stringContaining(
              "a",
              "yggdrasil",
              "Ubuntu Touch",
              "testfile"
            ),
            "asdf"
          )
        ));
  });

  describe("action__unpack()", () => {
    it("should unpack", () =>
      core.action__unpack({
        group: "firmware",
        files: [{ archive: "a.zip", dir: "a" }]
      })); // TODO add assertions
  });

  describe("action__manual_download()", () => {
    it("should resolve if checksum was verified", () => {
      jest
        .spyOn(mainEvent, "emit")
        .mockImplementation((e, f, g, cb) => (cb ? cb() : null));
      checkFile.mockResolvedValue(true);
      return core
        .action__manual_download({
          group: "firmware",
          file: { name: "a.zip" }
        })
        .then(() => {
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:working",
            "particles"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            "Manual download"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            "Checking firmware files..."
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(3);
        });
    });
    it("should instruct manual download", () => {
      jest
        .spyOn(mainEvent, "emit")
        .mockImplementation((e, f, g, cb) => (cb ? cb() : null));
      checkFile.mockResolvedValueOnce(false);
      return core
        .action__manual_download({
          group: "firmware",
          file: { name: "a.zip" }
        })
        .then(() => {
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:working",
            "particles"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            "Manual download"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            "Checking firmware files..."
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(5);
        });
    });
    it("should reject on checksum mismatch", done => {
      jest
        .spyOn(mainEvent, "emit")
        .mockImplementation((e, f, g, cb) => (cb ? cb("a") : null));
      checkFile.mockResolvedValue(false);
      core
        .action__manual_download({
          group: "firmware",
          file: { name: "a.zip" }
        })
        .catch(e => {
          expect(e.message).toEqual("checksum mismatch");
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:working",
            "particles"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:status",
            "Manual download"
          );
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:write:under",
            "Checking firmware files..."
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(5);
          done();
        });
    });
  });
});
