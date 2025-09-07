const axios = require("axios");
jest.mock("axios");
axios.create.mockReturnValue(axios);
const api = require("./api.js");

const MOCK_DATA = {
  releases: [
    {
      name: "edge",
      pretty_name: "edge (unsupported)",
      devices: [
        {
          name: "somedevice",
          pretty_name: "Some Device",
          interfaces: [
            {
              name: "phosh",
              pretty_name: "Phosh"
            },
            {
              name: "plasma-mobile",
              pretty_name: "Plasma Mobile",
              images: [
                {
                  timestamp: 0,
                  url: "someurl",
                  sha256: "sha256-first"
                },
                {
                  timestamp: 0,
                  url: "someurl2",
                  sha256: "sha256-other"
                }
              ]
            },
            {
              name: "sxmo-de-sway",
              pretty_name: "Sxmo (Sway)"
            },
            {
              name: "other",
              pretty_name: "Other"
            }
          ]
        },
        {
          name: "somedevicewithvariant",
          pretty_name: "Some Device With Variant",
          interfaces: [
            {
              name: "phosh",
              pretty_name: "Phosh"
            },
            {
              name: "plasma-mobile",
              pretty_name: "Plasma Mobile",
              images: [
                {
                  timestamp: 0,
                  url: "someurl-somedevicewithvariant-somevariant",
                  sha256: "sha256-first"
                },
                {
                  timestamp: 0,
                  url: "someurl-somedevicewithvariant-anothervariant",
                  sha256: "sha256-other"
                }
              ]
            },
            {
              name: "sxmo-de-sway",
              pretty_name: "Sxmo (Sway)"
            },
            {
              name: "other",
              pretty_name: "Other"
            }
          ]
        }
      ]
    }
  ]
};

describe("postmarketos api", () => {
  beforeEach(() => {
    axios.get.mockResolvedValueOnce({
      data: MOCK_DATA
    });
  });

  describe("getInterfaces()", () => {
    it("should resolve interfaces", async () => {
      const result = await api.getInterfaces("somedevice");
      expect(result).toContainEqual({
        value: "phosh",
        label: "Phosh"
      });
      expect(result).toContainEqual({
        value: "plasma-mobile",
        label: "Plasma Mobile"
      });
      expect(result).toContainEqual({
        value: "sxmo-de-sway",
        label: "Sxmo (Sway)"
      });
      expect(result).toContainEqual({
        value: "other",
        label: "Other"
      });
    });

    it("should reject on errors", async () => {
      axios.get.mockReset();
      axios.get.mockRejectedValueOnce({
        response: {
          status: 404
        }
      });

      const test = () => api.getInterfaces("nonexistent");
      await expect(test).rejects.toThrow("404");

      axios.get.mockRejectedValueOnce(new Error("other"));
      await expect(test).rejects.toThrow("other");
    });
  });

  describe("getImages()", () => {
    it("should resolve images", async () => {
      const result = await api.getImages("edge", "plasma-mobile", "somedevice");
      expect(result).toContainEqual({
        url: "someurl",
        checksum: {
          sum: "sha256-first",
          algorithm: "sha256"
        }
      });
    });

    it("should resolve images with variants", async () => {
      const result = await api.getImages(
        "edge",
        "plasma-mobile",
        "somedevicewithvariant",
        "somevariant"
      );
      expect(result).toContainEqual({
        url: "someurl-somedevicewithvariant-somevariant",
        checksum: {
          sum: "sha256-first",
          algorithm: "sha256"
        }
      });
    });

    it("should throw on 404", async () => {
      axios.get.mockReset();
      axios.get.mockRejectedValueOnce({
        response: {
          status: 404
        }
      });

      const test = () => api.getImages("non", "existent", "stuff", "here");
      await expect(test).rejects.toThrow("404");

      axios.get.mockRejectedValueOnce(new Error("other"));
      await expect(test).rejects.toThrow("other");
    });
  });

  describe("getReleases()", () => {
    it("should resolve releases", async () => {
      const result = await api.getReleases("somedevice");
      expect(result).toEqual([{ label: "edge (unsupported)", value: "edge" }]);
    });

    it("should throw on 404", async () => {
      axios.get.mockReset();
      axios.get.mockRejectedValueOnce({
        response: {
          status: 404
        }
      });

      const test = () => api.getReleases("nonexistent");
      await expect(test).rejects.toThrow("404");

      axios.get.mockRejectedValueOnce(new Error("other"));
      await expect(test).rejects.toThrow("other");
    });
  });
});
