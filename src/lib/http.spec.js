jest.mock("axios", () => ({ create: jest.fn() }));
jest.mock("https-proxy-agent", () => ({ HttpsProxyAgent: jest.fn() }));
jest.mock("proxy-from-env", () => ({ getProxyForUrl: jest.fn() }));

const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { getProxyForUrl } = require("proxy-from-env");
const { createHttpClient } = require("./http.js");

const request = { use: jest.fn() };

describe("createHttpClient()", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    axios.create.mockReturnValue({ interceptors: { request } });
  });

  it("tunnels HTTPS requests through an HTTP proxy", () => {
    getProxyForUrl.mockReturnValue("http://127.0.0.1:1080");
    createHttpClient({ baseURL: "https://example.com", timeout: 1000 });

    expect(axios.create).toHaveBeenCalledWith({
      baseURL: "https://example.com",
      timeout: 1000
    });

    const configureRequest = request.use.mock.calls[0][0];
    const config = configureRequest({
      url: "/api",
      baseURL: "https://example.com"
    });

    expect(getProxyForUrl).toHaveBeenCalledWith("https://example.com/api");
    expect(HttpsProxyAgent).toHaveBeenCalledWith("http://127.0.0.1:1080");
    expect(config.proxy).toBe(false);
  });

  it("leaves HTTPS proxies and excluded hosts to Axios", () => {
    getProxyForUrl.mockReturnValue("https://proxy.example.com:8443");
    createHttpClient({ baseURL: "https://example.com" });

    const configureRequest = request.use.mock.calls[0][0];
    const config = configureRequest({
      url: "/api",
      baseURL: "https://example.com"
    });

    expect(HttpsProxyAgent).not.toHaveBeenCalled();
    expect(config.proxy).toBeUndefined();
  });
});