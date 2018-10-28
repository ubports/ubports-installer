#!/bin/sh

distro=$(lsb_release -si)

if [ "$distro" = "openSUSE" ]; then
    packages="npm nodejs"
else
    packages="npm nodejs-legacy"
fi

sudo apt install $packages
npm install
