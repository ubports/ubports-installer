const { webContents } = require("electron");
jest.mock("electron");
const window = require("./window.js");

it("should be a singleton", () => {
  expect(require("./window.js")).toBe(require("./window.js"));
});

describe("Window class", () => {
  describe("getMain()", () => {
    it("should return webContents", () => {
      const mockWebContents = {};
      webContents.fromId.mockReturnValue(mockWebContents);
      expect(window.getMain()).toEqual(mockWebContents);
      expect(webContents.fromId).toHaveBeenCalledWith(1);
    });
    it("should return null if nonexistent", () => {
      webContents.fromId.mockReturnValue();
      expect(window.getMain()).toEqual(null);
      expect(webContents.fromId).toHaveBeenCalledWith(1);
    });
    it("should return null on error", () => {
      webContents.fromId.mockImplementation(() => {
        throw new Error();
      });
      expect(window.getMain()).toEqual(null);
      expect(webContents.fromId).toHaveBeenCalledWith(1);
    });
  });
  describe("send()", () => {
    it("should send", () => {
      const mockWebContents = {
        send: jest.fn()
      };
      webContents.fromId.mockReturnValue(mockWebContents);
      expect(window.send("a", "b", { c: "d" })).toEqual(undefined);
      expect(mockWebContents.send).toHaveBeenCalledWith("a", "b", { c: "d" });
    });
    it("should fail silently", () => {
      webContents.fromId.mockReturnValue(null);
      expect(window.send("a", "b", { c: "d" })).toEqual(undefined);
    });
  });
});
