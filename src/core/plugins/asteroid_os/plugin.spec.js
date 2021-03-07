const api = require("./api.js");
jest.mock("./api.js");
api.getImages.mockResolvedValue("a");
api.getChannels.mockResolvedValue(["1.0", "nightlies"]);
const asteroid_os = new (require("./plugin.js"))({
  os: { name: "Asteroid OS" },
  config: { codename: "lenok" },
  settings: { channel: "1.0" }
});

describe("asteroid_os plugin", () => {
  describe("actions", () => {
    describe("download", () => {
      it("should create download steps", () =>
        asteroid_os.action__download().then(r =>
          expect(r).toEqual([
            {
              actions: [
                { "core:download": { files: "a", group: "AsteroidOS" } }
              ]
            }
          ])
        ));
    });
  });
  describe("remote_values", () => {
    describe("channels", () => {
      it("should resolve channels", () =>
        asteroid_os.remote_values__channels().then(r =>
          expect(r).toEqual([
            { label: "1.0", value: "1.0" },
            { label: "nightlies", value: "nightlies" }
          ])
        ));
    });
  });
});
