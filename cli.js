#!/usr/bin/env node

/*

This tool is meant to be used for testing or for being wrapped by other scripts
and programs. It is not meant to be a user-facing cli installation tool and
does *not* try to be user-friendly.

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const cli = require("commander");
const devices = require("./src/devices");
const adb = require("./src/adb");
const utils = require("./src/utils");
const systemImage = require("./src/system-image");
const package = require("./package.json")

const defaultChannel = "15.04/stable";

process.env.NO_GUI = 1;

const panic = (m) => {
    console.log(m);
    process.exit(1)
}

const setEvents = (downloadEvent) => {
    downloadEvent.on("download:done", () => {
        console.log("Download complete");
    });
    downloadEvent.on("download:error", (r) => {
        console.log("Download error " + r);
    });
    downloadEvent.on("error", (r) => {
        console.log("Error: " + r);
    });
    downloadEvent.on("download:checking", () => {
        console.log("Download checking file");
    });
    downloadEvent.on("download:startCheck", () => {
        utils.log.info("Download startCheck");
    });
    downloadEvent.on("download:start", (r) => {
        console.log("Starting download of " + r + " files");
    });
    downloadEvent.on("download:next", (i) => {
        console.log(`Downloading next file, ${i} left`);
    });
    downloadEvent.on("download:progress", (i) => {
        process.stdout.write(`Downloading file, ${Math.ceil(i.percent*100)}% complete\r`);
    });
    downloadEvent.on("adbpush:done", () => {
        console.log("Done pusing files");
        console.log("Rebooting to recovery to flash");
        adb.reboot("recovery", () => {});
    });
    downloadEvent.on("adbpush:error", (e) => {
        console.log("Adb push error", e)
    });
    downloadEvent.on("adbpush:progress", (r) => {
        process.stdout.write("Adb push, " + r + "% left\r")
    });
    downloadEvent.on("adbpush:next", (r) => {
        console.log("Start pusing next file, " + r + " files left")
    });
    downloadEvent.on("adbpush:start", (r) => {
        console.log("Start pusing " + r + " files")
    });
    downloadEvent.on("user:reboot", (r) => {
        console.log("Please reboot your device to", r.state);
    });
    downloadEvent.on("bootstrap:flashing", (r) => {
        console.log("Flashing images");
    });
}

const install = (device, ownEvent, eventSet) => {
    console.log(`Installing on ${device}`);
    console.log(`Using channel ${channel}`);
    var downloadEvent = systemImage.installLatestVersion({
      device: device,
      channel: channel,
      event: ownEvent
    });
    if (!eventSet)
        setEvents(downloadEvent);
}

var getDevice = (callback) => {
    adb.hasAdbAccess((adbAccess) => {
        if (!adbAccess) {
            if (!cli.bootstrap)
                panic("I do not have adb access");
            if (!cli.device)
                panic("Cannot detect device, plase use --device <device>");
        }
        if (!cli.device) {
            adb.getDeviceName((device) => {
                callback(device);
            })
        } else {
            callback(cli.device);
        }
    })
}

var bootstrap = (device) => {
    console.log(`Bootstraping on ${device}`);
    console.log(`Using channel ${channel}`);
    var installEvent = devices.install(device, channel, true);
    setEvents(installEvent);
}

cli
    .version(package.version)
    .option('-d, --device <device>', 'Specify device')
    .option('-c, --channel <channel>', 'Specify channel (default: 15.04/stable)')
    .option('-v, --verbose', "Verbose output")
    .option('-b, --bootstrap', "Flash boot and recovery from bootloader")
    .parse(process.argv);

var channel = cli.channel || defaultChannel;
if (cli.verbose) process.env.DEBUG = 1;
if (cli.bootstrap) {
    getDevice(bootstrap)
    utils.ensureRoot("Bootstrap requres root");
} else getDevice(install)
