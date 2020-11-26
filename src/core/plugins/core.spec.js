const mainEvent = require("../../lib/mainEvent.js");
const { download } = require("progressive-downloader");
const core = require("./core.js");

it("should be a singleton", () => expect(core).toEqual(require("./core.js")));

describe("core plugin", () => {
  describe("group()", () => {
    it("should resolve group steps", () =>
      core.group([{}]).then(r => expect(r).toEqual([{}])));
    it("should resolve null on empty array", () =>
      core.group([]).then(r => expect(r).toEqual(null)));
  });

  describe("user_action()", () => {
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
        jest.spyOn(mainEvent, "emit").mockImplementation((m, d, cb) => cb());
        return core.user_action(action, null, user_actions).then(r => {
          expect(r).toEqual(substeps);
          expect(mainEvent.emit).toHaveBeenCalledWith(
            "user:action",
            { foo: "bar" },
            expect.any(Function)
          );
          expect(mainEvent.emit).toHaveBeenCalledTimes(1);
          mainEvent.emit.mockRestore();
        });
      })
    );
  });

  describe("download()", () => {
    global.installProperties = { device: "bacon" };
    it("should download", () =>
      core.download({
        group: "fimrware",
        files: [
          { url: "a/c", checksum: { sum: "b", algorithm: "sha256" } },
          { url: "a/b", checksum: { sum: "a", algorithm: "sha256" } }
        ]
      })); // TODO add assertions for event messages
    it("should show network error", done => {
      download.mockRejectedValueOnce("download error");
      jest.spyOn(mainEvent, "emit");
      core
        .download({
          group: "fimrware",
          files: [
            { url: "a/c", checksum: { sum: "b", algorithm: "sha256" } },
            { url: "a/b", checksum: { sum: "a", algorithm: "sha256" } }
          ]
        })
        .catch(error => {
          expect(error.message).toEqual("core:download download error");
          expect(mainEvent.emit).toHaveBeenCalledWith("user:no-network");
          expect(mainEvent.emit).toHaveBeenCalledTimes(1);
          mainEvent.emit.mockRestore();
          done();
        });
    });
  });
});
