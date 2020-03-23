require("jquery");
window.$ = window.jQuery = require("../../node_modules/jquery/dist/jquery.js");
const { shell } = require("electron");
const remote = require("electron").remote;
var ipcRenderer = require("electron").ipcRenderer;
require("bootstrap");
global.installProperties = remote.getGlobal("installProperties");
global.packageInfo = remote.getGlobal("packageInfo");
