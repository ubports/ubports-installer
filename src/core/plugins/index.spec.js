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
  });
});
