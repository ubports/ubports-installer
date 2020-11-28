process.argv = [null, null, "-vv"];
const mainEvent = require("../lib/mainEvent.js");
jest.useFakeTimers();

const log = require("../lib/log.js");
const errors = require("../lib/errors.js");
const fs = require("fs-extra");
fs.readdirSync.mockReturnValue(["core"]);

const core = require("./core.js");

it("should be a singleton", () => {
  expect(require("./core.js")).toBe(require("./core.js"));
});

const settings = {
  channel: "16.04/arm64/hybris/stable",
  wipe: false,
  bootstrap: true
};
core.props.settings = settings;

const user_actions = {};
const handlers = {
  fastboot_lock: {}
};
core.props.config = { user_actions, handlers };

describe("Core module", () => {
  describe("run", () => {
    const steps = [
      { actions: [{ "a:x": null }, { "b:y": null }] },
      { actions: [{ "c:z": null }] }
    ];
    it("should run steps", () => {
      jest.spyOn(core, "step").mockResolvedValue();
      return core.run(steps).then(() => {
        expect(core.step).toHaveBeenCalledWith(steps[0]);
        expect(core.step).toHaveBeenCalledWith(steps[1]);
        expect(core.step).toHaveBeenCalledTimes(2);
        core.step.mockRestore();
      });
    });
    it("should fail silently", () => {
      jest.spyOn(core, "step").mockRejectedValue();
      return core.run(steps).then(() => {
        expect(core.step).toHaveBeenCalledWith(steps[0]);
        expect(core.step).toHaveBeenCalledTimes(1);
        core.step.mockRestore();
      });
    });
  });

  describe("step", () => {
    it("should run step", done => {
      jest.spyOn(core, "actions").mockResolvedValue();
      core.step({ actions: [{ "a:x": null }] }).then(() => {
        expect(log.winston.log).toHaveBeenCalledWith(
          "verbose",
          'running step {"actions":[{"a:x":null}]}'
        );
        expect(core.actions).toHaveBeenCalledWith([{ "a:x": null }]);
        expect(core.actions).toHaveBeenCalledTimes(1);
        core.actions.mockRestore();
        done();
      });
      jest.runOnlyPendingTimers();
    });
    it("should handle error", () => {
      jest
        .spyOn(core, "actions")
        .mockRejectedValue({ error: new Error("aaa"), action: "a:x" });
      jest.spyOn(core, "handle").mockResolvedValue();
      core.step({ actions: [{ "a:x": null }] }).then(() => {
        expect(core.handle).toHaveBeenCalledWith(expect.any(Error), "a:x", {
          actions: [{ "a:x": null }]
        });
        expect(core.handle).toHaveBeenCalledTimes(1);
        core.actions.mockRestore();
        core.handle.mockRestore();
      });
      jest.runOnlyPendingTimers();
    });
    it("should run conditional step", done => {
      jest.spyOn(core, "actions").mockResolvedValue();
      core
        .step({
          actions: [{ "a:x": null }],
          condition: { var: "wipe", value: false }
        })
        .then(() => {
          expect(log.winston.log).toHaveBeenCalledWith(
            "verbose",
            'running step {"actions":[{"a:x":null}],"condition":{"var":"wipe","value":false}}'
          );
          expect(core.actions).toHaveBeenCalledWith([{ "a:x": null }]);
          expect(core.actions).toHaveBeenCalledTimes(1);
          core.actions.mockRestore();
          done();
        });
      jest.runOnlyPendingTimers();
    });
    it("should skip conditional step", done => {
      jest.spyOn(core, "actions").mockResolvedValue();
      core
        .step({
          actions: [{ "a:x": null }],
          condition: { var: "wipe", value: true }
        })
        .then(() => {
          expect(log.winston.log).toHaveBeenCalledWith(
            "verbose",
            'skipping step {"actions":[{"a:x":null}],"condition":{"var":"wipe","value":true}}'
          );
          expect(core.actions).toHaveBeenCalledTimes(0);
          core.actions.mockRestore();
          done();
        });
      jest.runOnlyPendingTimers();
    });
  });

  describe("actions()", () => {
    it("should run actions", () => {
      jest.spyOn(core, "action").mockResolvedValue();
      return core
        .actions([{ "a:x": null }, { "a:y": { foo: "bar" } }])
        .then(() => {
          expect(core.action).toHaveBeenCalledWith({ "a:x": null });
          expect(core.action).toHaveBeenCalledWith({ "a:y": { foo: "bar" } });
          expect(core.action).toHaveBeenCalledTimes(2);
          core.action.mockRestore();
        });
    });
    it("should reject on error actions", done => {
      jest.spyOn(core, "action").mockRejectedValue("oh no");
      core.actions([{ "a:x": null }, { "a:y": { foo: "bar" } }]).catch(e => {
        expect(e).toEqual("oh no");
        expect(core.action).toHaveBeenCalledWith({ "a:x": null });
        expect(core.action).toHaveBeenCalledTimes(1);
        core.action.mockRestore();
        done();
      });
    });
  });

  describe("action()", () => {
    it("should run action", () => {
      core.plugins = { a: { actions: { y: jest.fn().mockResolvedValue() } } };
      return core.action({ "a:y": { foo: "bar" } }).then(r => {
        expect(r).toEqual(null);
        expect(core.plugins.a.actions.y).toHaveBeenCalledWith(
          { foo: "bar" },
          settings,
          user_actions
        );
      });
    });
    it("should run substeps generated by action", () => {
      jest.spyOn(core, "run").mockResolvedValue();
      core.plugins = {
        a: { actions: { y: jest.fn().mockResolvedValue([{}]) } }
      };
      return core.action({ "a:y": { foo: "bar" } }).then(r => {
        expect(r).toEqual(undefined);
        expect(core.plugins.a.actions.y).toHaveBeenCalledWith(
          { foo: "bar" },
          settings,
          user_actions
        );
        expect(core.run).toHaveBeenCalledWith([{}]);
        expect(core.run).toHaveBeenCalledTimes(1);
        core.run.mockRestore();
      });
    });
    it("should reject on unknown plugin", done => {
      core.plugins = { b: {} };
      core.action({ "a:y": { foo: "bar" } }).catch(e => {
        expect(e.error.message).toEqual("Unknown action a:y");
        expect(e.action).toEqual("a:y");
        done();
      });
    });
    it("should reject on unknown action", done => {
      core.plugins = { a: {} };
      core.action({ "a:y": { foo: "bar" } }).catch(e => {
        expect(e.error.message).toEqual("Unknown action a:y");
        expect(e.action).toEqual("a:y");
        done();
      });
    });
    it("should reject on error", done => {
      core.plugins = {
        a: {
          actions: { y: jest.fn().mockRejectedValue(new Error("some error")) }
        }
      };
      core.action({ "a:y": { foo: "bar" } }).catch(e => {
        expect(e.error.message).toEqual("some error");
        expect(e.action).toEqual("a:y");
        done();
      });
    });
  });

  describe("handle()", () => {
    it("should ignore errors on optional steps", () => {
      expect(
        core.handle(new Error("some error"), "a:x", { optional: true })
      ).toEqual(undefined);
    });
    it("should ignore fallback actions", () => {
      jest.spyOn(core, "actions").mockResolvedValue();
      return core
        .handle(new Error("some error"), "a:x", { fallback: [{}] })
        .then(r => {
          expect(core.actions).toHaveBeenCalledWith([{}]);
          core.actions.mockRestore();
        });
    });
    it("should show low power error", done => {
      jest.spyOn(mainEvent, "emit").mockImplementation(m => {
        expect(m).toEqual("user:low-power");
        mainEvent.emit.mockRestore();
        done();
      });
      core.handle(new Error("low battery"), "a:x", {});
    });
    it("should ignore 'killed' errors", done => {
      try {
        core.handle(new Error("killed"), "a:x", { actions: [{ "a:x": null }] });
      } catch (e) {
        expect(e.message).toEqual("killed");
        done();
      }
    });
    it("should let the user ignore the error", () => {
      jest
        .spyOn(errors, "toUser")
        .mockImplementation((e, l, again, ignore) => ignore());
      return core
        .handle(new Error("some error"), "a:x", { actions: [{ "a:x": null }] })
        .then(r => expect(r).toEqual(null));
    });
    it("should let the user try again", () => {
      jest
        .spyOn(errors, "toUser")
        .mockImplementation((e, l, again, ignore) => again());
      jest.spyOn(core, "step").mockResolvedValue();
      return core
        .handle(new Error("some error"), "a:x", { actions: [{ "a:x": null }] })
        .then(() => {
          expect(core.step).toHaveBeenCalledWith({
            actions: [{ "a:x": null }]
          });
          expect(core.step).toHaveBeenCalledTimes(1);
          core.step.mockRestore();
        });
    });
  });

  describe("evaluate()", () => {
    [
      {
        res: true
      },
      {
        exp: null,
        res: true
      },
      {
        exp: undefined,
        res: true
      },
      {
        exp: { var: "bootstrap", value: true },
        res: true
      },
      {
        exp: { var: "bootstrap", value: false },
        res: false
      },
      {
        exp: {
          NOT: { var: "bootstrap", value: false }
        },
        res: true
      },
      {
        exp: {
          AND: [
            { var: "bootstrap", value: true },
            { var: "wipe", value: false }
          ]
        },
        res: true
      },
      {
        exp: {
          AND: [
            { var: "bootstrap", value: true },
            { var: "wipe", value: true }
          ]
        },
        res: false
      },
      {
        exp: {
          OR: [
            { var: "bootstrap", value: true },
            { var: "wipe", value: false }
          ]
        },
        res: true
      },
      {
        exp: {
          OR: [
            { var: "bootstrap", value: false },
            { var: "wipe", value: false }
          ]
        },
        res: true
      },
      {
        exp: {
          AND: [
            {
              OR: [
                { var: "channel", value: "16.04/arm64/hybris/stable" },
                { var: "channel", value: "16.04/arm64/hybris/rc" }
              ]
            },
            { var: "wipe", value: false },
            { NOT: { var: "bootstrap", value: false } }
          ]
        },
        res: true
      }
    ].forEach(({ exp, res }) =>
      it(`should return ${res} for ${JSON.stringify(exp)}`, () =>
        expect(core.evaluate(exp)).toEqual(res))
    );
  });

  describe("delay()", () => {
    it("should resolve after delay", done => {
      core.delay(100).then(() => {
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 100);
        done();
      });
      jest.runOnlyPendingTimers();
    });
    it("should resolve after 250 if nothing is specified", done => {
      core.delay().then(() => {
        expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 250);
        done();
      });
      jest.runOnlyPendingTimers();
    });
  });
});
