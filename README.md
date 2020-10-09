# UBports Installer ![Continuous Integration](https://github.com/ubports/ubports-installer/workflows/Continuous%20Integration/badge.svg) [![snap](https://snapcraft.io//ubports-installer/badge.svg)](https://snapcraft.io/ubports-installer)

Fear not! Installing [UBports](https://ubports.com) [Ubuntu Touch](https://ubuntu-touch.io) on your [device](https://devices.ubuntu-touch.io) is easy! Just download the UBports Installer package for your operating system and sit back and relax while your computer does all the rest. Installing third-party operating systems has never been so easy!

| ![linux logo](https://i.ibb.co/CPq1pL9/linux.png) &nbsp; Linux | ![mac logo](https://i.ibb.co/Qn2NXq9/apple.png) &nbsp; macOS | ![windowslogo](https://i.ibb.co/RNk81kH/windows10.png) &nbsp; Windows |
|:---:|:---:|:---:|
|[snap](https://snapcraft.io/ubports-installer), [AppImage](https://devices.ubuntu-touch.io/installer?package=appimage), [deb](https://devices.ubuntu-touch.io/installer?package=deb) | [dmg](https://devices.ubuntu-touch.io/installer?package=dmg) | [exe](https://devices.ubuntu-touch.io/installer?package=exe) |

## Troubleshooting

Troubleshooting information can be found [in the docs](https://docs.ubports.com/en/latest/userguide/install.html). If you need help, you can join UBports' support channels on [telegram](https://t.me/WelcomePlus) or [matrix](https://matrix.to/#/!KwdniMNeTmClpgHkND:matrix.org?via=matrix.org&via=ubports.chat&via=disroot.org) or ask a question [in the forum](https://forums.ubports.com/) or on [askubuntu](https://askubuntu.com). If you believe that the UBports Installer is not working correctly, you can also [file a new issue](https://github.com/ubports/ubports-installer/issues/new) to help us solve the problem. Use the *Report a bug* button directly in the installer to generate a template for a bugreport with all the important metadata automatically filled out.

## Config files

By default, the Installer will always use the latest version of the [installation configuration files](https://github.com/ubports/installer-configs) available. Should you want to specify a custom config file, you can do that by starting the Installer with the `-f ./path/to/config.json` argument. This can be used to test changes to the configuration or even to add new devices to the installer. The [structure of the config files is specified here](https://github.com/ubports/installer-configs/blob/master/v1/_device.schema.json).

## Logs

If the installer runs into an error, it will usually present you with the option to create a bug report. It is always a good idea to make use of that feature, because that way the developers will almost always have all the information they need to help you. If you still have to look at the log file for some reason, you can find it in `~/.cache/ubports/ubports-installer.log` on linux (or `~/snap/ubports-installer/current/.cache/ubports/ubports-installer.log` if you're using the snap package). On Windows, it will be located at `%APPDATA%\ubports\ubports-installer.log` and on macOS you can find it under `$HOME/Library/Caches/ubports/ubports-installer.log`.

## Set up for development

Currently our script will automatically install the toolchain for you on Arch, Ubuntu, OpenSUSE and other apt based distributions.
```
git clone https://github.com/ubports/ubports-installer.git
cd ubports-installer
./setup-dev.sh
```

### Run with npm

```
$ npm start -- -h
Usage: ubports-installer [options]

Options:
  -V, --version                               output the version number
  -s, --settings "<setting>: <value>[, ...]"  [experimental] Override install settings
  -f, --file <file>                           [experimental] Override the config by loading a file
  -v, --verbose                               Enable verbose logging
  -D, --debug                                 Enable debugging tools and verbose logging
  -h, --help                                  output usage information
```

### Lint

Before filing a PR, please make sure you follow our coding style. Just run `npm lint` to see if there are any problems. If there are, it might even be possible to fix them automatically by running `npm lint-fix`.

### Build packages

```
$ ./build.js --help
Usage: ./build.js -o <os> -p <package> -a <arch> [options]

Options:
  -V, --version                output the version number
  -o, --os <os>                Target operating system (darwin, win32, linux) (default: "linux")
  -p, --package <package>      Target package (deb, snap, AppImage, dmg, portable, dir) (default: "dir")
  -a, --arch <architecture>    Target architecture (armv7l, x64, ia32, arm64) (default: "x64")
  -e, --extra-metadata [JSON]  extra data for package.json (default: "{}")
  -h, --help                   output usage information
```
