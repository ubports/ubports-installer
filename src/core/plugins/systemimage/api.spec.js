process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const cli = require("../../../lib/cli.js");
jest.mock("../../../lib/cli.js");
const api = require("./api.js");

const images = [
  {
    version: 2,
    type: "full",
    files: [
      {
        checksum: "1336",
        path: "asdf.img",
        signature: "asdf.img.asc"
      }
    ]
  },
  {
    version: 3,
    type: "full",
    files: [
      {
        checksum: "1337",
        path: "asdf.img",
        signature: "asdf.img.asc"
      }
    ]
  }
];

const getExpectedFiles = (checksum = "1337") => [
  {
    checksum: { algorithm: "sha256", sum: checksum },
    url: "https://system-image.ubports.com/asdf.img"
  },
  { url: "https://system-image.ubports.com/asdf.img.asc" },
  {
    url: "https://system-image.ubports.com/gpg/image-signing.tar.xz"
  },
  {
    url: "https://system-image.ubports.com/gpg/image-signing.tar.xz.asc"
  },
  {
    url: "https://system-image.ubports.com/gpg/image-master.tar.xz"
  },
  {
    url: "https://system-image.ubports.com/gpg/image-master.tar.xz.asc"
  }
];

const expectedCommands =
  "\
format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system\n\
format data\n\
update asdf.img asdf.img.asc\n\
enable developer_mode\n\
disable mtp\n\
unmount system";

describe("systemimage api", () => {
  describe("getImages", () => {
    afterEach(() => {
      delete cli.build;
    });
    it("should resolve images", () => {
      axios.get.mockResolvedValueOnce({ data: { images } });
      return api
        .getImages("16.04/stable", "bacon", true, ["developer_mode"], ["mtp"])
        .then(r =>
          expect(r).toEqual({
            commands: expectedCommands,
            files: getExpectedFiles()
          })
        );
    });
    it("should find requested image version", () => {
      cli.build = 2;
      axios.get.mockResolvedValueOnce({ data: { images } });
      return api
        .getImages("16.04/stable", "bacon", true, ["developer_mode"], ["mtp"])
        .then(r =>
          expect(r).toEqual({
            commands: expectedCommands,
            files: getExpectedFiles("1336")
          })
        );
    });
    it("should reject if there are no images", done => {
      axios.get.mockResolvedValueOnce({ data: { images: [] } });
      api.getImages("stable", "lenok").catch(e => {
        expect(e.message).toEqual("no image on channel stable");
        done();
      });
    });
    it("should reject if there are no images with the version requested", done => {
      cli.build = 1;
      axios.get.mockResolvedValueOnce({ data: { images } });
      api.getImages("16.04/stable", "bacon", true).catch(e => {
        expect(e.message).toEqual("no image on channel 16.04/stable");
        done();
      });
    });
    it("should reject on 404", done => {
      axios.get.mockRejectedValueOnce({ response: { status: 404 } });
      api.getImages("1.0", "lenok").catch(e => {
        expect(e.message).toEqual("404");
        done();
      });
    });
    it("should reject on network error", done => {
      axios.get.mockRejectedValueOnce();
      api.getImages("1.0", "lenok").catch(e => {
        expect(e.message).toEqual("no network");
        done();
      });
    });
  });
  describe("getChannels", () => {
    it("should resolve channels", () => {
      axios.get.mockResolvedValue({
        data: {
          "ubports-touch/16.04/stable": { devices: { bacon: "a" } },
          "16.04/stable": {
            devices: { bacon: "a" },
            hidden: true,
            alias: "ubports-touch/16.04/stable"
          },
          "17.04/stable": { devices: { bacon: "a" }, hidden: true },
          "18.04/stable": { devices: { bacon: "a" }, redirect: "asdf" },
          "19.04/stable": { devices: { hamburger: "a" } }
        }
      });
      return api.getChannels("bacon").then(r =>
        expect(r).toEqual([
          {
            hidden: false,
            value: "ubports-touch/16.04/stable"
          },
          {
            hidden: true,
            value: "17.04/stable"
          }
        ])
      );
    });
  });
});
