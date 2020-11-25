process.argv = [null, null, "-vv"];
jest.useFakeTimers();

const log = require("../lib/log.js");

const core = require("./core.js");

it("should be a singleton", () => {
  expect(require("./core.js")).toBe(require("./core.js"));
});

const settings = {
  channel: "16.04/arm64/hybris/stable",
  wipe: false,
  bootstrap: true
};

describe("Core module", () => {
  describe("run", () => {
    it("should run steps", () => {
      jest.spyOn(core, "step").mockResolvedValue();
      return core.run([{ a: "" }, { b: "" }], settings).then(() => {
        expect(core.step).toHaveBeenCalledWith({ a: "" }, settings);
        expect(core.step).toHaveBeenCalledWith({ b: "" }, settings);
        expect(core.step).toHaveBeenCalledTimes(2);
        core.step.mockRestore();
      });
    });
    it("should fail silently", () => {
      jest.spyOn(core, "step").mockRejectedValue();
      return core.run([{ a: "" }, { b: "" }], settings).then(() => {
        expect(core.step).toHaveBeenCalledWith({ a: "" }, settings);
        expect(core.step).toHaveBeenCalledTimes(1);
        core.step.mockRestore();
      });
    });
  });

  describe("step", () => {
    it("should run step", done => {
      core.step({}, settings).then(() => {
        expect(log.winston.log).toHaveBeenCalledWith(
          "debug",
          "running step {}"
        );
        done();
      });
      jest.runOnlyPendingTimers();
    });
    it("should run conditional step", done => {
      core
        .step({ condition: { var: "wipe", value: false } }, settings)
        .then(() => {
          expect(log.winston.log).toHaveBeenCalledWith(
            "debug",
            'running step {"condition":{"var":"wipe","value":false}}'
          );
          done();
        });
      jest.runOnlyPendingTimers();
    });
    it("should skip conditional step", done => {
      core
        .step({ condition: { var: "wipe", value: true } }, settings)
        .then(() => {
          expect(log.winston.log).toHaveBeenCalledWith(
            "debug",
            'skipping step {"condition":{"var":"wipe","value":true}}'
          );
          done();
        });
      jest.runOnlyPendingTimers();
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
        expect(core.evaluate(exp, settings)).toEqual(res))
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
