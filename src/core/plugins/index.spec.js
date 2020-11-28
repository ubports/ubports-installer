const { parseExpectedArgs } = require("commander");
const { isType } = require("graphql");
const PluginIndex = require("./index.js");

it("should construct", () => expect(new PluginIndex()).toBeDefined());
