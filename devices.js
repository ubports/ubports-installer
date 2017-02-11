"use strict";

const http = require("request");
const adb = require("./adb");
const fastboot = require("./fastboot");
const systemImage = require("./system-image");
const utils = require("./utils");
const os = require("os");
const path = require("path");
const events = require("events")
const fEvent = require('forward-emitter');

class event extends events {}

const ubportsApi = "https://devices.ubports.com/";
const downloadPath = os.homedir() + "/.cache/ubports/";

var getDevices = (callback) => {
    http.get({
        url: ubportsApi + "api/installer/devices",
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    })
}

var getDevice = (device, callback) => {
    http.get({
        url: ubportsApi + "api/device/" + device,
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod, device);
        else callback(false, device);
    })
}

var getInstallInstructs = (device, callback) => {
    http.get({
        url: ubportsApi + "api/installer/" + device,
        json: true
    }, (err, res, bod) => {
        if (!err && res.statusCode === 200)
            callback(bod);
        else callback(false);
    }).o
}

var getNotWorking = (ww) => {
    var notWorking = [];
    var whatsWorking = JSON.parse(ww);
    for (var i in whatsWorking) {
        if (whatsWorking[i] === 1)
            notWorking.push(i);
    }
    if (whatsWorking.length === 0)
        return false;
    return notWorking;
}

var formatNotWorking = (nw) => {
    return nw.join(", ").replace("/\,(?=[^,]*$)", " and");
}

var instructReboot = (state, rebootEvent, callback) => {
    adb.hasAdbAccess((hasAccess) => {
        if (hasAccess) {
            adb.reboot(state, () => {
                rebootEvent.emit("adb:rebooted");
            });
        } else {
            rebootEvent.emit("user:reboot", {
                button: "up",
                state: state
            });
        }
        if (state === "bootloader") {
            fastboot.waitForDevice(() => {
                rebootEvent.emit("reboot:done");
                rebootEvent.emit("state:bootloader");
                callback();
            })
        } else {
            adb.waitForDevice(() => {
                // We expect the device state to mach installState now
                    rebootEvent.emit("reboot:done");
                    rebootEvent.emit("state:" + state);
                    callback()
            });
        }
    })
}

var instructBootstrap = (fastbootboot, images, bootstrapEvent) => {
    //TODO check bootloader name/version/device
    //TODO OEM unlock
    if (fastbootboot) {
        bootstrapEvent.emit("user:write:status", "Booting into recovery image...")
    } else {
        bootstrapEvent.emit("bootstrap:flashing")
        bootstrapEvent.emit("user:write:status", "Flashing images")
        fastboot.flash(images, (err) => {
            if(err)
              bootstrapEvent.emit("error", err)
            else
              bootstrapEvent.emit("bootstrap:done")
        })
    }
}

var getInstallSettings = (instructs, setting) => {
    if (instructs.install_settings[setting])
        return instructs.install_settings[setting]
    return false;
}

var addPathToImages = (instructs, device) => {
    var images = [];
    instructs.images.forEach((image) => {
        image["path"] = downloadPath+"images/"+device;
        images.push(image);
    })
    return images;
}

var setEvents = (downloadEvent) => {
  downloadEvent.on("download:done", () => {
    console.log("Download complete");
  });
  downloadEvent.on("download:error", (r) => {
    console.log("Download error "+r);
  });
  downloadEvent.on("error", (r) => {
    console.log("Error: "+r);
  });
  downloadEvent.on("download:checking", () => {
    console.log("Download checking file");
  });
  downloadEvent.on("download:startCheck", () => {
    downloadEvent.emit("user:write:status", "Checking Ubuntu touch files");
    utils.log("Download startCheck");
  });
  downloadEvent.on("download:start", (r) => {
    console.log("Starting download of "+r+" files");
    downloadEvent.emit("user:write:status", "Downloading Ubuntu touch");
  });
  downloadEvent.on("download:next", (i) => {
    console.log(`Downloading next file, ${i} left`);
    downloadEvent.emit("user:write:next", "Downloading", i);
  });
  downloadEvent.on("download:progress", (i) => {
    console.log(`Downloading file, ${Math.ceil(i.percent*100)}% left`);
    downloadEvent.emit("user:write:progress", Math.ceil(i.percent*100));
  });
  downloadEvent.on("adbpush:done", () => {
    console.log("Done pusing files");
    console.log("Rebooting to recovery to flash");
    downloadEvent.emit("system-image:done");
    downloadEvent.emit("user:write:status", "Rebooting to recovery to start the flashing process");
    downloadEvent.emit("user:write:done");
  });
  downloadEvent.on("adbpush:error", (e) => {
    console.log("Adb push error", e)
  });
  downloadEvent.on("adbpush:progress", (r) => {
    console.log("Adb push, "+r+"% left");
    downloadEvent.emit("user:write:progress", r);
  });
  downloadEvent.on("adbpush:next", (r) => {
    console.log("Start pusing next file, " + r + " files left")
    downloadEvent.emit("user:write:next", "Pushing", r);
  });
  downloadEvent.on("adbpush:start", (r) => {
    console.log("Start pusing "+r+" files")
    downloadEvent.emit("user:write:status", "Pushing files to device");
    downloadEvent.emit("user:write:start", "Pushing", r);
  });
}

var install = (device, channel, noUserEvents, noSystemImage) => {
    const installEvent = new event();
    getInstallInstructs(device, (instructs) => {
        if (!noUserEvents)
          setEvents(installEvent);
        installEvent.on("images:startDownload", () => {
            installEvent.emit("user:write:status", "Downloading images");
            utils.downloadFiles(addPathToImages(instructs, device), installEvent)
        })
        installEvent.on("system-image:start", () => {
          if(!noSystemImage)
            systemImage.installLatestVersion(device, channel, installEvent);
        })
        installEvent.on("system-image:done", () => {
            instructReboot("recovery", installEvent, () => {
              installEvent.emit("install:done");
            });
        })
        installEvent.on("bootstrap:done", () => {
            utils.log("bootstrap done");
            instructReboot("recovery", installEvent, () => {
                installEvent.emit("system-image:start")
            });
        })
        if (getInstallSettings(instructs, "bootstrap")) {
            // We need to be in bootloader
            instructReboot("bootloader", installEvent, () => {
                installEvent.once("download:done", () => {
                  utils.log("done downloading(once listener)");
                  instructBootstrap(getInstallSettings(instructs, "fastbootboot"), addPathToImages(instructs, device), installEvent)
                })
                installEvent.emit("images:startDownload")
            });
        } else {
            // We need to be in recovery
            instructReboot("recovery", installEvent, () => {
                installEvent.emit("system-image:start")
            });
        }
    });
    return installEvent;
}

var getChannelSelects = (device, callback) => {
    systemImage.getChannes((channels) => {
        var channelsAppend = [];
        // Have a small delay here, without this it seems to trigger
        // some prevent_dual_callback function in "requests"
        setTimeout(function () {
          getInstallInstructs(device, (ret) => {
              systemImage.getDeviceChannes(device, channels).forEach((channel) => {
                  var _channel = channel.replace("ubuntu-touch/", "");
                  // Ignore blacklisted channels
                  if (ret["system_server"]["blacklist"].indexOf(channel) > -1)
                      return;
                  if (channel === ret["system_server"]["selected"])
                      channelsAppend.push("<option selected>" + _channel + "</option>");
                  else
                      channelsAppend.push("<option>" + _channel + "</option>");
              });
              callback(channelsAppend.join(''));
          })
        }, 10);
    });
}

module.exports = {
    getDevice: getDevice,
    waitForDevice: (callback) => {
        var waitEvent = adb.waitForDevice(() => {
            adb.getDeviceName((name) => {
                getDevice(name, (ret) => {
                    getChannelSelects(ret.device.device, (channels) => {
                        callback(ret, device, channels);
                    })
                });
            })
        })
        waitEvent.on("device:select", (device) => {
            waitEvent.emit("stop");
            getDevice(device, (ret) => {
                getChannelSelects(ret.device.device, (channels) => {
                    callback(ret, ret.device.device, channels);
                })
            });
        })
        return waitEvent;
    },
    getInstallInstructs: getInstallInstructs,
    getNotWorking: getNotWorking,
    formatNotWorking: formatNotWorking,
    install: install,
    getFormatedNotWorking: (ww) => {
        return formatNotWorking(getNotWorking(ww));
    },
    getDeviceSelects: (callback) => {
        getDevices((devices) => {
            var devicesAppend = [];
            devices.forEach((device) => {
                devicesAppend.push("<option name=\"" + device.device + "\">" + device.name + "</option>");
            })
            callback(devicesAppend.join(''));
        })
    },
    getChannelSelects: getChannelSelects
}
