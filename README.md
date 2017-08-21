## Ubports installer

[![Build Status](https://travis-ci.org/ubports/ubports-installer.svg?branch=master)](https://travis-ci.org/ubports/ubports-installer) [![Build status](https://ci.appveyor.com/api/projects/status/cjcqxleyfeuvv28s?svg=true)](https://ci.appveyor.com/project/mariogrip/ubports-installer) [![Coverage Status](https://coveralls.io/repos/github/ubports/ubports-installer/badge.svg?branch=master)](https://coveralls.io/github/ubports/ubports-installer?branch=master)

This is still under development expect some bugs

### How to install

#### Linux:


##### Appimage:
1. Download the latest Appimage from https://github.com/ubports/ubports-installer/releases
2. [Make the AppImage executable](https://discourse.appimage.org/t/how-to-make-an-appimage-executable/80)
3. Then run the file by double-clicking


#### Mac

1. Download the latest dmg file from https://github.com/ubports/ubports-installer/releases
2. Open the file and follow the onscreen instructions.


#### Windows

1. Download the latest exe file from https://github.com/ubports/ubports-installer/releases
2. Open the file and follow the onscreen instructions


### How to install from source

```
git clone git@github.com:ubports/ubports-installer.git
cd ubports-installer
./setup-dev.sh
```

### How to start GUI

```
npm start
```

### How to use CLI

*Please note that the cli is made for testing purposes.*

```
$ ./cli.js

Usage: cli [options]

Options:

  -h, --help               output usage information
  -V, --version            output the version number
  -d, --device <device>    Specify device
  -c, --channel <channel>  Specify channel (default: ubuntu-touch/stable)
  -v, --verbose            Verbose output
  -b, --bootstrap          Flash boot and recovery from bootloader
```
