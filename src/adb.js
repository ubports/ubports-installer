"use strict";

/*

Adb wrapper, part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const sys = require('util')
const exec = require('child_process').execFile;
const path = require("path");
const fs = require("fs");
const events = require("events")
const fEvent = require('forward-emitter');
const utils = require("./utils");
const adb = utils.getPlatformTools().adb

console.log(adb);

class event extends events {}

var guessState = (callback) => {
  // Check for Ubuntu

  // Check for Android

  // Check for recovery

  // Check for bootloader
}

var getDeviceName = (callback, method) => {
  if (!method) method = "device";
  exec(adb, ["shell", "getprop ro.product."+method], (err, stdout, stderr) => {
    if (err !== null) callback(false);
    else callback(stdout.replace(/\W/g, ""));
  });
}

var push = (file, dest, pushEvent) => {
  var done;
  var fileSize = fs.statSync(file)["size"];
  exec(adb, ["push", file, dest], (err, stdout, stderr) => {
    done=true;
    if (err !== null) pushEvent.emit("adbpush:error", err)
    else pushEvent.emit("adbpush:end")
  });
  var progress = () => {
    setTimeout(function () {
     shell("stat -t "+dest+"/"+path.basename(file)+" |awk '{print $2}'", (currentSize) => {
       pushEvent.emit("adbpush:progress", Math.ceil((currentSize/fileSize)*100))
       if(!done)
        progress();
     })
   }, 1000);
  }
  progress();
  return pushEvent;
}

var pushMany = (files, pushManyEvent) => {
  if (files.length <= 0){
    pushManyEvent.emit("adbpush:error", "No files provided");
    return false;
  }
  pushManyEvent.emit("adbpush:start", files.length);
  push(files[0].src, files[0].dest, pushManyEvent);
  pushManyEvent.on("adbpush:end", () => {
        files.shift();
        if (files.length <= 0){
          pushManyEvent.emit("adbpush:done");
          return;
        }
        pushManyEvent.emit("adbpush:next", files.length)
        push(files[0].src, files[0].dest, pushManyEvent);
  })
  return pushManyEvent
}

var shell = (cmd, callback) => {
  exec(adb, ["shell", cmd], (err, stdout, stderr) => {
//    console.log(err);
    if (err !== null) callback(false);
    else callback(stdout);
  })
}

var waitForDevice = (callback) => {
  var stop;
  var waitEvent = new event();
  var repeat = () => {
    shell("echo 1", (r) => {
      if(r){
        callback(true)
      }else {
        setTimeout(() => {
          if(!stop) repeat();
        }, 1000)
      }
    })
  }
  repeat();
  waitEvent.on("stop", () => {
    stop=true;
  });
  return waitEvent;
}

var hasAdbAccess = (callback) => {
  shell("echo 1", (r) => {
    callback(r);
  })
}

var reboot = (state, callback) => {
  exec(adb, ["reboot", state], (err, stdout, stderr) => {
    if (err !== null) callback(false);
    else callback(state);
  })
}

module.exports = {
  waitForDevice: waitForDevice,
  shell: shell,
  getDeviceName: getDeviceName,
  push: push,
  pushMany: pushMany,
  hasAdbAccess: hasAdbAccess,
  reboot: reboot,
  getDeviceState: (callback) => {

  }
}
