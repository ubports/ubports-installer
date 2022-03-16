process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const api = require("./api.js");

const files = [
  {
    checksum: { algorithm: "sha256", sum: "1337" },
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

describe("systemimage api", () => {
  describe("getImages", () => {
    it("should resolve images", () => {
      axios.get.mockResolvedValueOnce({
        data: {
          images: [
            {
              type: "full",
              files: [
                {
                  checksum: "1337",
                  path: "asdf.img",
                  signature: "asdf.img.asc"
                }
              ]
            }
          ]
        }
      });
      return api.getImages("16.04/stable", "bacon").then(r =>
        expect(r).toEqual({
          commands:
            "format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system\n\n\
update asdf.img asdf.img.asc\n\
unmount system",
          files
        })
      );
    });
    describe("getImages", () => {
      it("should resolve images", () => {
        axios.get.mockResolvedValueOnce({
          data: {
            images: [
              {
                type: "full",
                files: [
                  {
                    checksum: "1337",
                    path: "asdf.img",
                    signature: "asdf.img.asc"
                  }
                ]
              }
            ]
          }
        });
        return api
          .getImages("16.04/stable", "bacon", true, ["developer_mode"], ["mtp"])
          .then(r =>
            expect(r).toEqual({
              commands:
                "format system\n\
load_keyring image-master.tar.xz image-master.tar.xz.asc\n\
load_keyring image-signing.tar.xz image-signing.tar.xz.asc\n\
mount system\n\
format data\n\
update asdf.img asdf.img.asc\n\
enable developer_mode\n\
disable mtp\n\
unmount system",
              files
            })
          );
      });
      it("should reject on 404", done => {
        axios.get.mockRejectedValueOnce({ response: { status: 404 } });
        api.getImages("1.0", "lenok").catch(e => {
          expect(e.message).toEqual("404");
          done();
        });
      });
      it("should reject on network error", done => {
        axios.get.mockRejectedValueOnce({ response: {} });
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
              label: "16.04/stable",
              value: "ubports-touch/16.04/stable"
            },
            {
              hidden: true,
              label: "17.04/stable",
              value: "17.04/stable"
            }
          ])
        );
      });
    });
  });
});
