process.argv = [null, null, "-vv"];
const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const { paste } = require("./paste.js");

it("should be a singleton", () => {
  expect(require("./paste.js")).toBe(require("./paste.js"));
});

describe("paste()", () => {
  it("should return paste url", () => {
    axios.post.mockResolvedValueOnce({ data: { slug: "asdf" } });
    expect(paste()).resolves.toBe("https://snip.hxrsh.in/asdf");
  });
  it("should return null if slug missing", () => {
    axios.post.mockResolvedValueOnce({ data: {} });
    expect(paste()).resolves.toBe(null);
  });
  it("should return null on error", () => {
    axios.post.mockRejectedValueOnce();
    expect(paste()).resolves.toBe(null);
  });
});
