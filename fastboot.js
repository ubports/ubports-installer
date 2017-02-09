const sudo = require('electron-sudo');

const options = {name: 'Ubports installer'}

var log = (image) => {
  console.log("log, flashed "+image)
}

var flashBoot = (image, callback) => {
  log(image)
  sudo.exec("fastboot flash boot "+image, options, (c, err) => {
    callback(c)
  });
}

var flashRecovery = (image) => {
  log(image)
  sudo.exec("fastboot flash recovery "+image, options , (c, err) => {
    callback(c)
  });
}

var waitForDevice = (callback) => {
  sudo.exec("fastboot w", options, (err) => {
    callback()
  })
}

var flash = (images, callback) => {
  if (images[0].recovery){
    flashRecovery(images[0].recovery, (c) => {
      images.shift();
      if (images.length <= 0)
        callback(c)
      else
        flash(images, callback)
    });
  }
  else if (images[0].boot) {
    boot(images[0].boot, (c) => {
      images.shift();
      if (images.length <= 0)
        callback(c)
      else
        flash(images, callback)
    });
  }
}

module.exports = {
  flash: flash,
  waitForDevice: waitForDevice
}
