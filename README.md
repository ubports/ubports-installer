# UBports Installer

[![Build Status](https://travis-ci.org/ubports/ubports-installer.svg?branch=master)](https://travis-ci.org/ubports/ubports-installer) [![Build status](https://ci.appveyor.com/api/projects/status/cjcqxleyfeuvv28s?svg=true)](https://ci.appveyor.com/project/mariogrip/ubports-installer) [![Snap Status](https://build.snapcraft.io/badge/ubports/ubports-installer.svg)](https://build.snapcraft.io/user/ubports/ubports-installer)

This tool is still under development, bugreports are appreciated.

## How to install

### Linux:

**Snap:**

1. Open a terminal
2. Run `snap install ubports-installer` to install
4. Run `ubports-installer` or select the icon in your application list to start the program

**Deb:**

1. Download the latest `.deb` file from https://github.com/ubports/ubports-installer/releases/latest
2. Open the deb package with your software installation tool and follow the on-screen instructions
3. Launch the program from your application list

**Appimage:**

1. Download the latest `.AppImage` file from https://github.com/ubports/ubports-installer/releases/latest
2. [Make the AppImage executable](https://discourse.appimage.org/t/how-to-make-an-appimage-executable/80)
3. Run the file by double-clicking

### Mac

1. Download the latest `.dmg` file from https://github.com/ubports/ubports-installer/releases/latest
2. Open the file and follow the onscreen instructions
3. Launch the program from the application list

### Windows

1. Install the [universal adb driver](http://adb.clockworkmod.com/) or a device-specific driver
2. Download the latest `.exe` file from https://github.com/ubports/ubports-installer/releases/latest
3. Launch the file and follow the onscreen instructions

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

### Build the snap

```
snapcraft cleanbuild
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

# Troubleshooting

<!-- ## Device not detected

If the device not detected, you might be missing **udev-rules**.

1. See if cat `/etc/udev/rules.d/51-android.rules` exists and contains the following rules:
```
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="0e79", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0502", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0b05", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="413c", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0489", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="091e", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="18d1", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0bb4", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="12d1", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="24e3", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="2116", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0482", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="17ef", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="1004", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="22b8", MODE="0666", GROUP="plugdev"    
SUBSYSTEM=="usb", ATTRS{idVendor}=="0409", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="2080", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0955", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="2257", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="10a9", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="1d4d", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0471", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="04da", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="05c6", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="1f53", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="04e8", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="04dd", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0fce", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="0930", MODE="0666", GROUP="plugdev"  
SUBSYSTEM=="usb", ATTRS{idVendor}=="19d2", MODE="0666", GROUP="plugdev"
SUBSYSTEM=="usb", ATTRS{idVendor}=="2ae5", MODE="0666", GROUP="plugdev"
```
2a. If this file does not exist or has not all the rules inside, create it as su or add accordingly.
2b. Also check if other files contain similar rules
3. Restart udev daemon by issuing `sudo service udev restart`
-->
## Connection lost during installation

Try a different USB cable and a different USB port on your computer. Cheap and old cables tend to loose connection during the installation.
