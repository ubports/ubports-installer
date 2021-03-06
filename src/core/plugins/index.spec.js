const log = { verbose: jest.fn() };
beforeEach(() => {
  log.verbose.mockReset();
});

const pluginIndex = new (require("./index.js"))({}, "a", {}, log);

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
  describe("getPluginArray()", () => {
    it("should return plugin array", () =>
      expect(pluginIndex.getPluginArray()).toHaveLength(6));
  });
  ["init", "kill"].forEach(f =>
    describe(`${f}()`, () => {
      it(`should ${f}`, () => {
        const mock = {};
        mock[f] = jest.fn();
        jest.spyOn(pluginIndex, "getPluginArray").mockReturnValueOnce([mock]);
        pluginIndex[f]();
        expect(mock[f]).toHaveBeenCalledTimes(1);
      });
    })
  );
  describe("wait()", () => {
    it("should wait", () => {
      const mock_resolved = { wait: jest.fn().mockResolvedValue("asdf") };
      const mock_cancel = { cancel: jest.fn() };
      const mock_pending = { wait: jest.fn().mockReturnValue(mock_cancel) };
      jest
        .spyOn(pluginIndex, "getPluginArray")
        .mockReturnValueOnce([mock_resolved, mock_pending]);
      return pluginIndex.wait().then(() => {
        expect(mock_resolved.wait).toHaveBeenCalledTimes(1);
        expect(mock_cancel.cancel).toHaveBeenCalledTimes(1);
      });
    });
    it("should throw error on no device", done => {
      const mock_rejected = { wait: jest.fn().mockRejectedValue("asdf") };
      jest
        .spyOn(pluginIndex, "getPluginArray")
        .mockReturnValueOnce([mock_rejected]);
      pluginIndex.wait().catch(e => {
        expect(mock_rejected.wait).toHaveBeenCalledTimes(1);
        expect(e.message).toEqual("no device");
        done();
      });
    });
    it("should be cancelable", done => {
      const mock_rejected = {
        wait: jest.fn().mockReturnValue({ cancel: done })
      };
      jest
        .spyOn(pluginIndex, "getPluginArray")
        .mockReturnValueOnce([mock_rejected]);
      const wait = pluginIndex.wait();
      wait.cancel();
    });
  });
});
