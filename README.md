# UBports Installer

[![Build Status](https://travis-ci.org/ubports/ubports-installer.svg?branch=master)](https://travis-ci.org/ubports/ubports-installer) [![Build status](https://ci.appveyor.com/api/projects/status/cjcqxleyfeuvv28s?svg=true)](https://ci.appveyor.com/project/mariogrip/ubports-installer) [![Snap Status](https://build.snapcraft.io/badge/ubports/ubports-installer.svg)](https://build.snapcraft.io/user/ubports/ubports-installer)

This tool is still under development, [bugreports](https://github.com/ubports/ubports-installer/issues/new) and [contributions](https://github.com/ubports/ubports-installer/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are appreciated!

## How to install

### Linux:

**Snap:**

1. Open a terminal
2. Run `snap install ubports-installer` to install
4. Run `ubports-installer` or select the icon in your application list to start the program

**Deb:**

1. Download the latest [deb](https://devices.ubuntu-touch.io/installer/deb) file from https://github.com/ubports/ubports-installer/releases/latest
2. Open the deb package with your software installation tool and follow the on-screen instructions
3. Launch the program from your application list

**Appimage:**

1. Download the latest [AppImage](https://devices.ubuntu-touch.io/installer/appimage) file from https://github.com/ubports/ubports-installer/releases/latest
2. [Make the AppImage executable](https://discourse.appimage.org/t/how-to-make-an-appimage-executable/80)
3. Run the file by double-clicking

### Mac

1. Download the latest [dmg](https://devices.ubuntu-touch.io/installer/mac) file from https://github.com/ubports/ubports-installer/releases/latest
2. Open the file and follow the onscreen instructions
3. Launch the program from the application list

### Windows

1. Install the [universal adb driver](http://adb.clockworkmod.com/) or a device-specific driver
2. Download the latest [exe](https://devices.ubuntu-touch.io/installer/windows) file from https://github.com/ubports/ubports-installer/releases/latest
3. Launch the program and follow the on-screen instructions

## Usage

Using the graphical user interface of the UBports Installer is recommended for most cases. Powerusers can also make use of the experimental command-line interface. See `ubports-installer -h` for information.

## Troubleshooting

If you need help, you can join UBports' support channels on [telegram](https://t.me/WelcomePlus) or [matrix](https://matrix.to/#/!KwdniMNeTmClpgHkND:matrix.org?via=matrix.org&via=ubports.chat&via=disroot.org) or ask a question [in the forum](https://forums.ubports.com/) or on [askubuntu](https://askubuntu.com). If you believe that the UBports Installer is not working correctly, you can also [file a new issue](https://github.com/ubports/ubports-installer/issues/new) to help us solve the problem. As a last resort, we also have [manual installation instructions for every device](https://devices.ubuntu-touch.io), that you can follow if you want to install without using the UBports Installer.

### Connection lost during installation

Try a different USB cable and a different USB port on your computer. Cheap and old cables tend to loose connection during the installation.

### Windows Defender prevents Installer from starting

We have contacted Microsoft about this problem, but they seem to think it's [enjoyable](https://twitter.com/Windows/status/1014984163433295875). To dismiss the warning, click on "More Information", then select "Run anyway".

### Device not detected

You might want to try using custom adb and fastboot binaries. For that, tick the "Custom tools" checkbox in the options and specify the path to adb and fastboot in the text-boxes below.

### Device not detected (Virtual Machine)

Make sure the virtual machine is allowed to access the USB port.

### Device not detected (Windows)

Install the [universal adb driver](http://adb.clockworkmod.com/) and try again.

### Device not detected (Fairphone 2 with Linux)

Run `echo 0x2ae5 >> ~/.android/adb_usb.ini` in the terminal and restart the installer.

### Device not detected (Linux except snap)

If the device not detected, you might be missing **udev-rules**.

1. See if cat `/etc/udev/rules.d/51-android.rules` exists and contains the rules below. If not, add them to the file and run `sudo service udev restart` or `sudo udevadm control --reload-rules && udevadm trigger`.

```
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
SUBSYSTEM=="usb", ATTRS{idVendor}=="2a45", MODE="0666", GROUP="plugdev"
```

## How to run the program from source

```
git clone https://github.com/ubports/ubports-installer.git
cd ubports-installer
./setup-dev.sh
```

### Run with npm

```
npm start            # for the normal mode with GUI
npm start -- -D      # for debug tools and verbose logging
npm start -- --cli   # for CLI mode without GUI
```

### Build packages

```
npm run-script dist:linux
npm run-script dist:mac
npm run-script dist:win
```
