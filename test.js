var dev = require("./devices.js");
var img = require("./system-image.js");
var adb = require("./adb.js")
const events = require("events")
const fEvent = require('forward-emitter');

class event extends events {}

/*
dev.getInstallInstructs("2", (d) => {
  console.log(dev.getInstallStep(d, "device"));
})




img.getDeviceIndex("FP2", "ubuntu-touch/stable", (index) => {
  var latest = img.getLatestVesion(index);
  if (!latest) {
    return;
  }
  var urls = img.getFilesUrlsArray(latest)
  console.log(img.getFileBasenameArray(urls));
})
*/
var myev = new event();

var ev = img.downloadFiles(["https://dl.dropboxusercontent.com/u/56653875/hammerhead/boot.img"])
fEvent(myev, ev);
myev.on("download:done", () => {
  console.log("done")
})
myev.on("download:progress", (r) => {
  console.log(r)
})
