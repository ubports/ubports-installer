------------------------------------------------------------------------

# <a href="https://imgbb.com/"><img src="https://i.ibb.co/5WgVdC1/uports.png" alt="uports" border="0"></a> &nbsp; UBports Installer &nbsp; <a href="https://imgbb.com/"><img src="https://i.ibb.co/5WgVdC1/uports.png" alt="uports" border="0"></a>

[![Build Status](https://travis-ci.org/ubports/ubports-installer.svg?branch=master)](https://travis-ci.org/ubports/ubports-installer) [![Build status](https://ci.appveyor.com/api/projects/status/cjcqxleyfeuvv28s?svg=true)](https://ci.appveyor.com/project/mariogrip/ubports-installer) [![Snap Status](https://build.snapcraft.io/badge/ubports/ubports-installer.svg)](https://build.snapcraft.io/user/ubports/ubports-installer)

![logo](http://usefoss.com/wp-content/uploads/2016/08/UBports-Site_Logo.png)

This tool is still under development, [bugreports](https://github.com/ubports/ubports-installer/issues/new) and [contributions](https://github.com/ubports/ubports-installer/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) are appreciated!

------------------------------------------------------------------------

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

Troubleshooting information can be found [in the docs](https://docs.ubports.com/en/latest/userguide/install.html). If you need help, you can join UBports' support channels on [telegram](https://t.me/WelcomePlus) or [matrix](https://matrix.to/#/!KwdniMNeTmClpgHkND:matrix.org?via=matrix.org&via=ubports.chat&via=disroot.org) or ask a question [in the forum](https://forums.ubports.com/) or on [askubuntu](https://askubuntu.com). If you believe that the UBports Installer is not working correctly, you can also [file a new issue](https://github.com/ubports/ubports-installer/issues/new) to help us solve the problem. As a last resort, we also have [manual installation instructions for every device](https://devices.ubuntu-touch.io), that you can follow if you want to install without using the UBports Installer.

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
