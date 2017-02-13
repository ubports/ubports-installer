const http = require("request");
const progress = require("request-progress");
const os = require("os");
const fs = require("fs");
const path = require("path");
const checksum = require('checksum');
const mkdirp = require('mkdirp');
const exec = require('child_process').exec;
const sudo = require('electron-sudo');

var log = (l) => {
  if(process.env.DEBUG){
    console.log(l);
  }
}

var getSudo = () => {
  if(process.env.NO_GUI)
    return exec;
  return sudo.exec;
}

var ensureRoot = (m) => {
  if(process.env.SUDO_UID)
    return;
  console.log(m)
  process.exit(1);
}

var checkFiles = (urls, callback) => {
    var urls_ = [];
    var next = () => {
        if (urls.length <= 1) {
            callback(urls_)
        } else {
            urls.shift();
            check()
        }
    }
    var check = () => {
        fs.access(urls[0].path + "/" + path.basename(urls[0].url), (err) => {
            if (err) {
                log("Not existing " + urls[0].path + "/" + path.basename(urls[0].url))
                urls_.push(urls[0]);
                next();
            } else {
                checksumFile(urls[0], (check) => {
                    if (check) {
                        log("Exists " + urls[0].path + "/" + path.basename(urls[0].url))
                        next()
                    } else {
                        log("Checksum no match " + urls[0].path + "/" + path.basename(urls[0].url))
                        urls_.push(urls[0]);
                        next()
                    }
                })
            }
        })
    }
    check();
}

var checksumFile = (file, callback) => {
    if (!file.checksum) {
        // No checksum so return true;
        callback(true);
        return;
    }
    checksum.file(file.path + "/" + path.basename(file.url), {
        algorithm: "sha256"
    }, function(err, sum) {
        log("checked: " +path.basename(file.url), sum === file.checksum)
        callback(sum === file.checksum, sum)
    })
}

/*
urls format:
[
  {
    url: "http://test.com",
    path: ".bla/bal/",
    checksum: "d342j43lj34hgth324hj32ke4"
  }
]
*/
var downloadFiles = (urls_, downloadEvent) => {
    var urls;
    downloadEvent.emit("download:startCheck");
    var dl = () => {
        if (!fs.existsSync(urls[0].path)) {
            mkdirp.sync(urls[0].path);
        }
        progress(http(urls[0].url))
            .on('progress', (state) => {
                downloadEvent.emit("download:progress", state);
            })
            .on('error', (err) => {
                downloadEvent.emit("download:error", err)
            })
            .on('end', () => {
                fs.rename(urls[0].path + "/" + path.basename(urls[0].url) + ".tmp",
                    urls[0].path + "/" + path.basename(urls[0].url), () => {
                        downloadEvent.emit("download:checking");
                        checksumFile(urls[0], (check) => {
                            if (check) {
                                if (urls.length <= 1) {
                                    downloadEvent.emit("download:done");
                                } else {
                                    urls.shift();
                                    downloadEvent.emit("download:next", urls.length);
                                    dl()
                                }
                            } else {
                                downloadEvent.emit("download:error", "Checksum did not match on file " + path.basename(urls[0].url));
                            }
                        })
                    })
            })
            .pipe(fs.createWriteStream(urls[0].path + "/" + path.basename(urls[0].url) + ".tmp"));
    }
    checkFiles(urls_, (ret) => {
        if (ret.length <= 0) {
            downloadEvent.emit("download:done");
        } else {
            urls = ret;
            downloadEvent.emit("download:start", urls.length);
            dl();
        }
    })
    return downloadEvent;
}

module.exports = {
    downloadFiles: downloadFiles,
    checksumFile: checksumFile,
    checkFiles: checkFiles,
    log: log,
    getSudo: getSudo,
    ensureRoot: ensureRoot
}
