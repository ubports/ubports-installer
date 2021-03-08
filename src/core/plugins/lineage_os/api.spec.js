process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const api = require("./api.js");

describe("lineage_os api", () => {
  describe("getLatestBuild", () => {
    it("should resolve images", () => {
      axios.get.mockResolvedValueOnce({
        data: {
          response: [
            { url: "a", id: "42" },
            { url: "b", id: "1337" }
          ]
        }
      });
      return api.getLatestBuild("nightlies", "bacon").then(r =>
        expect(r).toEqual([
          {
            checksum: { algorithm: "sha256", sum: "1337" },
            url: "b",
            name: "lineageos_rootfs_bacon.zip"
          }
        ])
      );
    });
    it("should reject on network error", done => {
      axios.get.mockRejectedValueOnce(new Error("no network"));
      return api.getLatestBuild("1.0", "lenok").catch(e => {
        expect(e.message).toEqual("no network");
        done();
      });
    });
  });
  describe("getChannels", () => {
    it("should resolve channels", () => {
      axios.get.mockResolvedValue({ data: { response: ["nightlies"] } });
      return api
        .getChannels("lenok")
        .then(r => expect(r).toEqual(["nightlies"]));
    });
    it("should reject on error", done => {
      axios.get.mockRejectedValueOnce(new Error("no network"));
      return api.getChannels("lenok").catch(r => {
        expect(r.message).toEqual("no network");
        done();
      });
    });
  });
});
