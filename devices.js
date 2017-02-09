const http = require("request");
const adb = require("./adb");
const fastboot = require("./fastboot");
const systemImage = require("./system-image");
const os = require("os");
const path = require("path");
const events = require("events")
const fEvent = require('forward-emitter');

class event extends events {}

const ubportsApi = "https://devices.ubports.com/";
//const localApi = "http://localhost:2702/";
const downloadPath = os.homedir() + "/.config/ubports/";

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
    http({
        url: ubportsApi+ "api/installer/"+device,
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
        if (state === "bootloader"){
          fastboot.waitForDevice(() => {
            rebootEvent.emit("reboot:done");
            rebootEvent.emit("state:bootloader");
            callback();
          })
        } else {
          adb.waitForDevice(() => {
              // We expect the device state to mach installState now
              var newState = adb.getDeviceState();
              if (newState === installState) {
                  rebootEvent.emit("reboot:done");
                  rebootEvent.emit("state:" + newState);
                  callback()
              } else {
                  //TODO handle ohno wrong state
                  console.log("oh no!, wrong state");
                  rebootEvent.emit("reboot:wrong_state");
              }
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
        bootstrapEvent.emit("user:write:status", "Flashing recovery image...")
        fastboot.flash(images, () => {
            bootstrapEvent.emit("bootstrap:done")
        })
    }
}

var instructInstall = () => {

}

var getInstallSettings = (instructs, setting) => {
    if (instructs.install_settings[setting])
        return instructs.install_settings[setting]
    return false;
}

var getImagesUrls = (instructs) => {
    var images = [];
    instructs.images.forEach((image) => {
        images.push(image["recovery"] || image["boot"]);
    })
    return images.length !== 0 ? images : false;
}

var getImagesPath = (instructs) => {
    var images = [];
    instructs.images.forEach((image) => {
        if (image.recovery)
          images.push({recovery: downloadPath + path.basename(image)});
        if (image.boot)
          images.push({boot: downloadPath + path.basename(image)});
    })
    return images;
}

var install = (device, channel) => {
    const installEvent = new event();
    getInstallInstructs(device, (instructs) => {
        installEvent.on("images:startDownload", () => {
            installEvent.emit("user:write:status", "Downloading images...");
            systemImage.downloadFiles(getImagesUrls(instructs), installEvent)
        })
        installEvent.on("system-image:startDownload", (device, channel) => {
            installEvent.emit("user:write:status", "Downloading Ubuntu touch...");
            systemImage.downloadLatestVersion(device, channel);
        })
        installEvent.on("system-image:startInstall", () => {
            installEvent.emit("user:write:status", "Installing Ubuntu touch...");
            if (getInstallSettings(instructs, "method") == "system-image") {
                systemImage.installLatestVersion()
            }
        })
        installEvent.on("bootstrap:done", () => {
            instructReboot("recovery", installEvent, () => {
                installEvent.once("donwload:done", {

                })
                installEvent.emit("system-image:startDownload")
            });
        })
        if (getInstallSettings(instructs, "bootstrap")) {
            // We need to be in bootloader
            instructReboot("bootloader", installEvent, () => {
                installEvent.once("download:done", () => {
                    instructBootstrap(getInstallSettings(instructs, "fastbootboot"), getImagesPath(instructs), installEvent)
                })
                installEvent.emit("images:startDownload")
            });
        } else {
            // We need to be in recovery
            instructReboot("recovery", installEvent, () => {
                installEvent.emit("system-image:startDownload")
            });
        }
    });
    return installEvent;
}

var getChannelSelects = (device, callback) => {
    systemImage.getChannes((channels) => {
        var channelsAppend = [];
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
    });
}

module.exports = {
    getDevice: getDevice,
    waitForDevice: (callback) => {
        var waitEvent =  adb.waitForDevice(() => {
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
          devicesAppend.push("<option name=\""+device.device+"\">" + device.name + "</option>");
        })
        callback(devicesAppend.join(''));
      })
    },
    getChannelSelects: getChannelSelects
}
