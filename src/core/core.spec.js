process.argv = [null, null, "-vv"];
const mainEvent = require("../lib/mainEvent.js");
jest.useFakeTimers("legacy");

const log = require("../lib/log.js");
const errors = require("../lib/errors.js");
const api = require("./helpers/api.js");
jest.mock("./helpers/api.js");

const core = require("./core.js");
const { ipcMain } = require("electron");
jest.mock("electron");

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
  describe("prepare()", () => {
    it("should prepare and read config", () => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core, "selectOs").mockResolvedValueOnce();
      return core.prepare("a").then(() => {
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.selectOs).toHaveBeenCalledTimes(1);
        core.selectOs.mockRestore();
      });
    });
    it("should prepare and get device selects", () => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest
        .spyOn(core.plugins, "wait")
        .mockReturnValueOnce(new Promise(() => null));
      core.props.config = null;
      api.getDeviceSelects.mockResolvedValueOnce([]);
      return core.prepare("a").then(() => {
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.plugins.wait).toHaveBeenCalledTimes(1);
        core.plugins.wait.mockRestore();
        core.props.config = { user_actions, handlers };
      });
    });
    it("should prepare and handle device selects error", () => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "wait").mockResolvedValueOnce("asdf");
      core.props.config = null;
      api.getDeviceSelects.mockRejectedValueOnce("some error");
      api.resolveAlias.mockResolvedValueOnce();
      return core.prepare("a").then(() => {
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.plugins.wait).toHaveBeenCalledTimes(1);
        core.plugins.wait.mockRestore();
        api.resolveAlias.mockRestore();
        core.props.config = { user_actions, handlers };
      });
    });
    it("should prepare and handle alias resolution error", () => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "wait").mockResolvedValueOnce("asdf");
      core.props.config = null;
      api.getDeviceSelects.mockRejectedValueOnce("some error");
      api.resolveAlias.mockRejectedValueOnce("some error");
      return core.prepare("a").then(() => {
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.plugins.wait).toHaveBeenCalledTimes(1);
        core.plugins.wait.mockRestore();
        api.resolveAlias.mockRestore();
        core.props.config = { user_actions, handlers };
      });
    });
    it("should prepare and resolve alias", done => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "wait").mockResolvedValueOnce("bacon");
      core.props.config = null;
      api.getDeviceSelects.mockReturnValueOnce(new Promise(() => null));
      api.resolveAlias.mockResolvedValueOnce("eggs");
      jest.spyOn(core, "setDevice").mockImplementation(() => {
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.plugins.wait).toHaveBeenCalledTimes(1);
        core.plugins.wait.mockRestore();
        expect(core.setDevice).toHaveBeenCalledWith("eggs");
        core.setDevice.mockRestore();
        core.props.config = { user_actions, handlers };
        done();
      });
      core.prepare("a");
    });
    it("should prepare and cancel wait when device is selected", done => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "wait").mockReturnValueOnce({
        catch: () => ({
          then: () => ({
            catch: () => ({
              then: () => ({
                cancel: () => {
                  expect(core.readConfigFile).toHaveBeenCalledWith("a");
                  expect(core.readConfigFile).toHaveBeenCalledTimes(1);
                  core.readConfigFile.mockRestore();
                  expect(core.plugins.init).toHaveBeenCalledTimes(1);
                  core.plugins.init.mockRestore();
                  expect(core.plugins.wait).toHaveBeenCalledTimes(1);
                  core.plugins.wait.mockRestore();
                  core.setDevice.mockRestore();
                  core.props.config = { user_actions, handlers };
                  done();
                }
              })
            })
          })
        })
      });
      ipcMain.once.mockImplementation((e, cb) => cb());
      core.props.config = null;
      api.getDeviceSelects.mockReturnValueOnce(new Promise(() => null));
      api.resolveAlias.mockResolvedValueOnce("eggs");
      jest.spyOn(core, "setDevice");
      core.prepare("a");
    });
    it("should prepare and not cancel if not possible", done => {
      jest.spyOn(core, "readConfigFile").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "init").mockResolvedValueOnce();
      jest.spyOn(core.plugins, "wait").mockReturnValueOnce({
        catch: () => ({
          then: () => ({
            catch: () => ({
              then: () => null
            })
          })
        })
      });
      ipcMain.once.mockImplementation((e, cb) => {
        cb();
        expect(core.readConfigFile).toHaveBeenCalledWith("a");
        expect(core.readConfigFile).toHaveBeenCalledTimes(1);
        core.readConfigFile.mockRestore();
        expect(core.plugins.init).toHaveBeenCalledTimes(1);
        core.plugins.init.mockRestore();
        expect(core.plugins.wait).toHaveBeenCalledTimes(1);
        core.plugins.wait.mockRestore();
        core.setDevice.mockRestore();
        core.props.config = { user_actions, handlers };
        done();
      });
      core.props.config = null;
      api.getDeviceSelects.mockReturnValueOnce(new Promise(() => null));
      api.resolveAlias.mockResolvedValueOnce("eggs");
      jest.spyOn(core, "setDevice");
      core.prepare("a");
    });
  });
  describe("kill()", () => {
    it("should kill", () => {
      jest.spyOn(core, "reset").mockReturnValue();
      jest.spyOn(core.plugins, "kill").mockResolvedValueOnce();
      return core.kill().then(() => {
        expect(core.reset).toHaveBeenCalledTimes(1);
        core.reset.mockRestore();
        expect(core.plugins.kill).toHaveBeenCalledTimes(1);
        core.plugins.kill.mockRestore();
      });
    });
  });
  describe("setConfig()", () => {
    it("should set config", () => {
      const old = core.props.config;
      return core.setConfig("new").then(() => {
        expect(core.props.config).toEqual("new");
        core.props.config = old;
      });
    });
  });
  describe("setDevice()", () => {
    it("should set Device", () => {
      jest.spyOn(mainEvent, "emit").mockReturnValue();
      jest.spyOn(api, "getDevice").mockResolvedValueOnce("config");
      jest.spyOn(core, "setConfig").mockResolvedValueOnce();
      jest.spyOn(core, "selectOs").mockResolvedValueOnce();
      return core.setDevice("new").then(() => {
        expect(mainEvent.emit).toHaveBeenCalledTimes(3);
        mainEvent.emit.mockRestore();
        expect(api.getDevice).toHaveBeenCalledTimes(1);
        expect(api.getDevice).toHaveBeenCalledWith("new");
        api.getDevice.mockRestore();
        expect(core.setConfig).toHaveBeenCalledTimes(1);
        expect(core.setConfig).toHaveBeenCalledWith("config");
        core.setConfig.mockRestore();
        expect(core.selectOs).toHaveBeenCalledTimes(1);
        core.selectOs.mockRestore();
      });
    });
    it("should indicate unsupported", () => {
      jest.spyOn(mainEvent, "emit").mockReturnValue();
      jest.spyOn(api, "getDevice").mockRejectedValueOnce();
      return core.setDevice("new").then(() => {
        expect(mainEvent.emit).toHaveBeenCalledTimes(4);
        mainEvent.emit.mockRestore();
        expect(api.getDevice).toHaveBeenCalledTimes(1);
        expect(api.getDevice).toHaveBeenCalledWith("new");
        api.getDevice.mockRestore();
      });
    });
  });
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
      jest.spyOn(core.plugins, "action").mockResolvedValue();
      return core.action({ "a:y": { foo: "bar" } }).then(r => {
        expect(r).toEqual(null);
        expect(core.plugins.action).toHaveBeenCalledWith({
          "a:y": { foo: "bar" }
        });
        expect(core.plugins.action).toHaveBeenCalledTimes(1);
        core.plugins.action.mockRestore();
      });
    });
    it("should run substeps generated by action", () => {
      jest.spyOn(core, "run").mockResolvedValue();
      jest.spyOn(core.plugins, "action").mockResolvedValue([{}]);
      return core.action({ "a:y": { foo: "bar" } }).then(r => {
        expect(r).toEqual(undefined);
        expect(core.plugins.action).toHaveBeenCalledWith({
          "a:y": { foo: "bar" }
        });
        expect(core.plugins.action).toHaveBeenCalledTimes(1);
        expect(core.run).toHaveBeenCalledWith([{}]);
        expect(core.run).toHaveBeenCalledTimes(1);
        core.run.mockRestore();
        core.plugins.action.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest.spyOn(core.plugins, "action").mockRejectedValue("some error");
      core.action({ "a:y": { foo: "bar" } }).catch(e => {
        expect(e).toEqual("some error");
        core.plugins.action.mockRestore();
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
