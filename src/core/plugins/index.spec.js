process.argv = [null, null, "-vv"];
const { plugins } = require("../core.js");

const log = {
  verbose: jest.fn(),
  warn: jest.fn(),
  command: jest.fn(),
  error: jest.fn()
};

const settings = {};

const pluginArgs = [{}, "a", {}, log, settings];

const pluginIndex = new (require("./index.js"))(...pluginArgs);
const originalPluginList = pluginIndex.plugins;

beforeEach(() => {
  for (const key in log) {
    log[key].mockReset();
  }
  pluginIndex.plugins = originalPluginList;
});

describe("PluginIndex", () => {
  it("should update params on plugins", () => {
    expect(pluginIndex.props).toEqual(pluginIndex.plugins.adb.props);
    pluginIndex.props.a = "a";
    expect(pluginIndex.props).toEqual(pluginIndex.plugins.adb.props);
    pluginIndex.props.a = "b";
    expect(pluginIndex.props).toEqual(pluginIndex.plugins.adb.props);
  });
  describe("parsePluginId", () => {
    it("should parse", () =>
      expect(pluginIndex.parsePluginId({ "a:b": null })).toEqual(["a", "b"]));
  });
  describe("action", () => {
    it("should run action", () => {
      jest
        .spyOn(pluginIndex.plugins.adb, "action__format")
        .mockResolvedValue(1337);
      return pluginIndex.action({ "adb:format": { a: "b" } }).then(r => {
        expect(r).toEqual(1337);
        expect(pluginIndex.plugins.adb.action__format).toHaveBeenCalledWith({
          a: "b"
        });
        expect(pluginIndex.plugins.adb.action__format).toHaveBeenCalledTimes(1);
        pluginIndex.plugins.adb.action__format.mockRestore();
      });
    });
    it("should reject on error", done => {
      jest
        .spyOn(pluginIndex.plugins.adb, "action__format")
        .mockRejectedValue("terrible");
      pluginIndex.action({ "adb:format": { a: "b" } }).catch(e => {
        expect(e).toEqual({ error: "terrible", action: "adb:format" });
        expect(pluginIndex.plugins.adb.action__format).toHaveBeenCalledWith({
          a: "b"
        });
        expect(pluginIndex.plugins.adb.action__format).toHaveBeenCalledTimes(1);
        pluginIndex.plugins.adb.action__format.mockRestore();
        done();
      });
    });
  });
  describe("remote_value", () => {
    it("should set remote_value", () => {
      jest
        .spyOn(pluginIndex.plugins.systemimage, "remote_values__channels")
        .mockResolvedValue(["a"]);
      return pluginIndex
        .remote_value({ remote_values: { "systemimage:channels": { a: "b" } } })
        .then(r => {
          expect(r).toEqual(["a"]);
          expect(
            pluginIndex.plugins.systemimage.remote_values__channels
          ).toHaveBeenCalledWith({
            remote_values: { "systemimage:channels": { a: "b" } },
            values: ["a"]
          });
          expect(
            pluginIndex.plugins.systemimage.remote_values__channels
          ).toHaveBeenCalledTimes(1);
          pluginIndex.plugins.systemimage.remote_values__channels.mockRestore();
        });
    });
    it("should resolve empty on invalid plugin", () => {
      return pluginIndex
        .remote_value({ remote_values: { "systemimage:invalid": { a: "b" } } })
        .then(r => {
          expect(r).toEqual([]);
        });
    });
    it("should resolve empty on invalid provider", () => {
      return pluginIndex
        .remote_value({ remote_values: { "invalid:invalid": { a: "b" } } })
        .then(r => {
          expect(r).toEqual([]);
        });
    });
  });
  describe("getPluginMappable()", () => {
    it("should return plugin array", () =>
      expect(pluginIndex.getPluginMappable()).toHaveLength(8));
  });
  ["init", "kill"].forEach(target =>
    describe(`${target}()`, () => {
      it(`should call ${target} on every plugin in the plugin array`, () => {
        const mock1 = {};
        const mock2 = {};
        mock1[target] = jest.fn(() => Promise.resolve(true));
        mock2[target] = jest.fn(() => Promise.resolve(true));
        mock_pluginList = {
          mock1: mock1,
          mock2: mock2
        };
        pluginIndex.plugins = mock_pluginList;
        pluginIndex[target]();
        expect(mock1[target]).toHaveBeenCalledTimes(1);
        expect(mock2[target]).toHaveBeenCalledTimes(1);
      });
    })
  );
  describe("init()", () => {
    // The happy path for init() is tested along with kill() above
    it("should log a warning and disable the plugin when it resolves with false", () => {
      const mock_resolvedFalse = { init: jest.fn().mockResolvedValue(false) };
      const mock_resolvedTrue = { init: jest.fn().mockResolvedValue(true) };
      const mock_pluginList = {
        resolvedFalse: mock_resolvedFalse,
        resolvedTrue: mock_resolvedTrue
      };
      pluginIndex.plugins = mock_pluginList;
      return pluginIndex.init().then(() => {
        expect(mock_resolvedFalse.init).toHaveBeenCalledTimes(1);
        expect(log.warn).toHaveBeenCalledTimes(1);
        expect(mock_pluginList).toEqual({ resolvedTrue: mock_resolvedTrue });
      });
    });
    it("should escalate the error including the plugin's name and error message and disable the plugin when it rejects", () => {
      const mock_rejected = {
        init: jest.fn().mockRejectedValue(new Error("Ow!"))
      };
      const mock_resolvedTrue = { init: jest.fn().mockResolvedValue(true) };
      const mock_pluginList = {
        initRejected: mock_rejected,
        resolvedTrue: mock_resolvedTrue
      };
      pluginIndex.plugins = mock_pluginList;
      return expect(pluginIndex.init())
        .rejects.toThrow(
          // Yes it's ugly, but it means "find 'Ow!' and 'initRejected' in any
          // order"
          /^(?=.*Ow\!)(?=.*initRejected).*$/
        )
        .then(() => {
          expect(mock_pluginList).toEqual({ resolvedTrue: mock_resolvedTrue });
        });
    });
  });
  describe("wait()", () => {
    it("should cancel all other tasks when one resolves", () => {
      const mock_resolved = {
        wait: jest.fn().mockResolvedValue("waitSuccessful")
      };
      const mock_cancelFunc = jest.fn(() => Promise.resolve());
      const mock_pending1 = {
        wait: jest.fn().mockReturnValue({
          catch: jest.fn().mockReturnValue({ cancel: mock_cancelFunc })
        })
      };
      const mock_pending2 = {
        wait: jest.fn().mockReturnValue({
          catch: jest.fn().mockReturnValue({ cancel: mock_cancelFunc })
        })
      };
      const mock_pluginList = {
        resolved: mock_resolved,
        pending1: mock_pending1,
        pending2: mock_pending2
      };
      pluginIndex.plugins = mock_pluginList;
      return pluginIndex.wait().then(() => {
        expect(mock_resolved.wait).toHaveBeenCalledTimes(1);
        expect(mock_cancelFunc).toHaveBeenCalledTimes(2);
      });
    });
    it("should throw a JSON-encoded error and disable the failed plugin when wait fails", done => {
      const mock_rejected = {
        wait: jest.fn().mockRejectedValue(new Error("waitRejected"))
      };
      const mock_pluginList = { rejected: mock_rejected };
      pluginIndex.plugins = mock_pluginList;
      pluginIndex.wait().catch(e => {
        errorJson = JSON.parse(e.message);
        expect(mock_rejected.wait).toHaveBeenCalledTimes(1);
        expect(errorJson.message).toEqual("waitRejected");
        expect(errorJson.name).toEqual("rejected");
        expect(mock_pluginList).toEqual({});
        done();
      });
    });
    it("should cancel all subtasks on cancel()", done => {
      mock_cancelFunc = jest.fn();
      const mock_rejected1 = {
        wait: jest.fn().mockReturnValue({
          catch: jest.fn().mockReturnValue({ cancel: mock_cancelFunc })
        })
      };
      const mock_rejected2 = {
        wait: jest.fn().mockReturnValue({
          catch: jest.fn().mockReturnValue({ cancel: mock_cancelFunc })
        })
      };
      mock_pluginList = {
        rejected1: mock_rejected1,
        rejected2: mock_rejected2
      };
      pluginIndex.plugins = mock_pluginList;
      const wait = pluginIndex.wait();
      wait.cancel();
      expect(mock_cancelFunc).toHaveBeenCalledTimes(2);
      done();
    });
  });
  describe("__pluginErrorHandler()", () => {
    it("should handle json-encoded errors", done => {
      const error = new Error('{"my": "problem"}');
      try {
        pluginIndex.__pluginErrorHandler("jsonencoded", error);
      } catch (e) {
        expect(e).toBe(error);
        expect(JSON.parse(e.message)).toEqual({
          message: '{"my": "problem"}',
          name: "jsonencoded"
        });
        done();
      }
    });
    it("should handle json-encoded errors with message", done => {
      const error = new Error('{"message": "problem"}');
      try {
        pluginIndex.__pluginErrorHandler("jsonencoded", error);
      } catch (e) {
        expect(e).toBe(error);
        expect(JSON.parse(e.message)).toEqual({
          message: "problem",
          name: "jsonencoded"
        });
        done();
      }
    });
    it("should handle string errors", done => {
      const error = new Error("problem");
      try {
        pluginIndex.__pluginErrorHandler("str", error);
      } catch (e) {
        expect(e).toBe(error);
        expect(JSON.parse(e.message)).toEqual({
          message: "problem",
          name: "str"
        });
        done();
      }
    });
  });
});
