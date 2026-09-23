"use strict";

const axios = require("axios");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { getProxyForUrl } = require("proxy-from-env");

const createHttpClient = options => {
  const client = axios.create(options);

  client.interceptors.request.use(config => {
    const requestUrl = new URL(config.url, config.baseURL);
    const proxyUrl = getProxyForUrl(requestUrl.href);

    if (requestUrl.protocol === "https:" && proxyUrl?.startsWith("http://")) {
      config.proxy = false;
      config.httpsAgent = new HttpsProxyAgent(proxyUrl);
    }

    return config;
  });

  return client;
};

module.exports = { createHttpClient };