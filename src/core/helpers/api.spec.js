const axios = require("axios");
const api = require("./api.js");

describe("getDeviceSelects()", () => {
  it("should resolve device selects", () => {
    axios.get.mockResolvedValueOnce({
      data: [
        { name: "A", codename: "a" },
        { name: "B", codename: "b" }
      ]
    });
    return api
      .getDeviceSelects()
      .then(r =>
        expect(r).toEqual([
          '<option name="a">A</option>',
          '<option name="b">B</option>'
        ])
      );
  });
});

describe("getDevice()", () => {
  it("should resolve device selects", () => {
    axios.get.mockResolvedValueOnce({ data: { name: "A", codename: "a" } });
    return api
      .getDevice("yggdrasil")
      .then(r => expect(r).toEqual({ name: "A", codename: "a" }));
  });
  it("should reject on error", done => {
    axios.get.mockRejectedValueOnce({ response: { status: "some error" } });
    api.getDevice("yggdrasil").catch(e => {
      expect(e).toEqual({ response: { status: "some error" } });
      done();
    });
  });
  it("should reject on unsupported device", done => {
    axios.get.mockRejectedValueOnce({ response: { status: 404 } });
    api.getDevice("yggdrasil").catch(e => {
      expect(e.message).toEqual("unsupported");
      done();
    });
  });
});

describe("resolveAlias()", () => {
  it("should resolve alias", () => {
    axios.get.mockResolvedValueOnce({ data: { a: "b" } });
    return api.resolveAlias("a").then(r => expect(r).toEqual("b"));
  });
  it("should not change canonical name", () => {
    axios.get.mockResolvedValueOnce({ data: { a: "b" } });
    return api.resolveAlias("b").then(r => expect(r).toEqual("b"));
  });
});
