const sys = require('util')
const exec = require('child_process').exec;
const path = require("path");
const fs = require("fs");
const events = require("events")
const fEvent = require('forward-emitter');

class event extends events {}

var guessState = (callback) => {
  // Check for Ubuntu

  // Check for Android

  // Check for recovery

  // Check for bootloader
}

var getDeviceName = (callback, method) => {
  if (!method) method = "device";
  exec("adb shell getprop ro.product."+method, (err, stdout, stderr) => {
    if (err !== null) callback(false);
    else callback(stdout);
  });
}

var push = (file, dest, callback) => {
  const pustEvent = new event();
  var done;
  var fileSize = fs.statSync(file)["size"];
  exec("adb push "+file+" "+dest, (err, stdout, stderr) => {
    done=true;
    if (err !== null) pushEvent.emit("error", err)
    else pushEvent.emit("end")
  });
  var progress = () => {
    setTimeout(function () {
     shell("stat -t "+dest+"/"+path.basename(file)+" |awk '{print $2}'", (currentSize) => {
       pushEvent.emit("progress", Math.ceil((currentSize/fileSize)*100))
       if(!done)
        progress();
     })
    }, 100);
  }
  progress();
  return pushEvent;
}

var pushMany = (files) => {
  const pushManyEvent = new event();
  const pushEvent = push(files[0].file, files[0].dest);
  fEvent(pushManyEvent, pushEvent);
  pushEvent.on("end", () => {
        files.shift();
        fEvent(pushManyEvent, pushMany(files));
  })
  return pushManyEvent
}

var shell = (cmd, callback) => {
  exec("adb shell " + cmd, (err, stdout, stderr) => {
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
        console.log("r")
      }else {
        setTimeout(() => {
          console.log("!r")
          if(!stop) repeat();
        }, 4000)
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
  exec("adb reboot " + state, (err, stdout, stderr) => {
    if (err !== null) callback(false);
    else callback(state);
  })
}

module.exports = {
  waitForDevice: waitForDevice,
  shell: shell,
  getDeviceName: getDeviceName,
  push: push,
  hasAdbAccess: hasAdbAccess,
  reboot: reboot,
  getDeviceState: (callback) => {

  }
}
