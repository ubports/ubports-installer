const mainEvent = { emit: jest.fn() };
beforeEach(() => mainEvent.emit.mockReset());
const fs = require("fs/promises");
jest.mock("fs/promises", () => ({
  rename: jest.fn()
}));
const log = require("../../../lib/log.js");
jest.mock("../../../lib/log.js");
const api = require("./api.js");
jest.mock("./api.js");
const path = require("path");

const cachePath = "surprise.xz/inthename";

const pmosPlugin = new (require("./plugin.js"))(
  {
    settings: {
      release: "somerelease",
      interface: "someinterface",
      variant: "somevariant"
    },
    config: {
      codename: "config_codename"
    },
    os: {
      codename: "os_codename"
    }
  },
  cachePath,
  mainEvent,
  log
);

describe("postmarketos plugin", () => {
  describe("action__download()", () => {
    it("should download images", async () => {
      const files = [{ url: "http://somewebsite.com/somefilename.zip" }];
      api.getImages.mockResolvedValueOnce(files);

      const ret = await pmosPlugin.action__download();
      expect(api.getImages).toHaveBeenCalledWith(
        "somerelease",
        "someinterface",
        "os_codename",
        "somevariant"
      );
      expect(ret[0]).toBeDefined();
      expect(ret[0].actions).toContainEqual({
        "core:download": {
          group: "postmarketOS",
          files
        }
      });
      expect(ret[0].actions).toContainEqual({
        "postmarketos:rename_unpacked_files": {
          group: "postmarketOS",
          files
        }
      });
      expect(ret[0].actions[1]["core:unpack"].files).toContainEqual({
        url: files[0].url,
        archive: "somefilename.zip"
      });
    });
  });

  describe("action__rename_unpacked_files()", () => {
    it("should rename the files", async () => {
      jest.spyOn(pmosPlugin.event, "emit").mockReturnValue();

      const group = "group";
      const basepath = path.join(cachePath, "config_codename", group);
      const files = [
        {
          url: "https://asdf.io/somethingelse.img.xz"
        },
        {
          url: "https://asdf.io/somethingelse-boot.img.xz"
        }
      ];

      await pmosPlugin.action__rename_unpacked_files({ group, files });
      expect(pmosPlugin.event.emit).toHaveBeenCalledTimes(3);
      expect(fs.rename).toHaveBeenCalledWith(
        path.join(basepath, "somethingelse.img"),
        path.join(basepath, "rootfs.img")
      );
      expect(fs.rename).toHaveBeenCalledWith(
        path.join(basepath, "somethingelse-boot.img"),
        path.join(basepath, "boot.img")
      );
    });
  });

  describe("remote_values__interfaces()", () => {
    it("should get interfaces", async () => {
      await pmosPlugin.remote_values__interfaces();

      expect(api.getInterfaces).toHaveBeenCalledWith("os_codename");
    });
  });

  describe("remote_values__releases()", () => {
    it("should get releases", async () => {
      api.getReleases.mockResolvedValueOnce([
        { value: "a", label: "aA" },
        { value: "b", label: "bB" }
      ]);
      const result = await pmosPlugin.remote_values__releases();
      expect(api.getReleases).toHaveBeenCalledWith("os_codename");
      expect(result).toContainEqual({
        label: "aA",
        value: "a"
      });
      expect(result).toContainEqual({
        label: "bB",
        value: "b"
      });
    });
  });
});
