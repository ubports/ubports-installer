#!/bin/sh

sudo apt install gir1.2-glib-2.0 libglib2.0-dev libselinux-dev libssl-dev zlib1g-dev npm nodejs-legacy
git submodule update --init --recursive
make -C android-tools
npm install
