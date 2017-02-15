## Ubports installer

This is still under development expect some bugs

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
