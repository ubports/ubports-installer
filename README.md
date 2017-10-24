# UBports Installer

[![Build Status](https://travis-ci.org/ubports/ubports-installer.svg?branch=master)](https://travis-ci.org/ubports/ubports-installer) [![Build status](https://ci.appveyor.com/api/projects/status/cjcqxleyfeuvv28s?svg=true)](https://ci.appveyor.com/project/mariogrip/ubports-installer) [![Coverage Status](https://coveralls.io/repos/github/ubports/ubports-installer/badge.svg?branch=master)](https://coveralls.io/github/ubports/ubports-installer?branch=master)

This is still under development expect some bugs

## How to install

### Linux:

**Snap:**

1. Open a terminal
2. Run `sudo snap install ubports-installer --devmode` to install
3. Run `ubports-installer` or select the icon in your application list to start the program

**Appimage:**

1. Download the latest Appimage from https://github.com/ubports/ubports-installer/releases
2. [Make the AppImage executable](https://discourse.appimage.org/t/how-to-make-an-appimage-executable/80)
3. Then run the file by double-clicking

**Deb:**

1. Download the latest deb from https://github.com/ubports/ubports-installer/releases
2. Open the deb package with your software installation tool and follow the on-screen instructions
3. Launch the program from your application list.

### Mac

1. Download the latest dmg file from https://github.com/ubports/ubports-installer/releases
2. Open the file and follow the onscreen instructions.
3. Launch the program from the application list. 

### Windows

1. Download the latest exe file from https://github.com/ubports/ubports-installer/releases
2. Open the file and follow the onscreen instructions
3. Launch the program from your application list.

*You might have to install the windows/android/adb drivers required for your device.*

## How to run the program from source

```
git clone https://github.com/ubports/ubports-installer.git
cd ubports-installer
./setup-dev.sh
```

### How to start GUI

```
npm start
```

### How to use CLI

*Please note that the command line interface was created for testing purposes only and does not necessarily try to be user-friendly.*

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
