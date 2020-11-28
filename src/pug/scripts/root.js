require("jquery");
window.$ = window.jQuery = require("jquery");
require("bootstrap");
const { shell, remote, ipcRenderer } = require("electron");

global.packageInfo = remote.getGlobal("packageInfo");
