process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const api = require("./api.js");

describe("asteroid_os api", () => {
  describe("getImages", () => {
    it("should resolve images", () => {
      axios.get.mockResolvedValueOnce({ data: "123 a\n456 b\n" });
      return api.getImages("1.0", "lenok").then(r =>
        expect(r).toEqual([
          {
            checksum: { algorithm: "md5", sum: "123" },
            url: "https://release.asteroidos.org/1.0/lenok/a"
          },
          {
            checksum: { algorithm: "md5", sum: "456" },
            url: "https://release.asteroidos.org/1.0/lenok/b"
          }
        ])
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
      axios.get.mockResolvedValue({ data: "123 a\n456 b\n" });
      axios.get.mockRejectedValueOnce({ response: { status: 404 } });
      return api
        .getChannels("lenok")
        .then(r => expect(r).toEqual(["nightlies", "1.0-alpha"]));
    });
    it("should reject on error", done => {
      axios.get.mockResolvedValue({ data: "123 a\n456 b\n" });
      axios.get.mockRejectedValueOnce({ response: {} });
      api.getChannels("lenok").catch(r => {
        expect(r.message).toEqual("no network");
        done();
      });
    });
  });
});
