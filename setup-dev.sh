#!/bin/bash

distro=$(lsb_release -si)
version=$(lsb_release -sr)

if [ "$distro" = "openSUSE" ]; then
    packages="npm nodejs"
elif [ "$distro" = "Ubuntu" -a ${version:0:2} -ge 18 ]; then
    packages="npm nodejs libgconf2-4"
else
    packages="npm nodejs-legacy"
fi

echo "Installing nodejs..."
sudo apt install $packages

echo "Setting up node modules..."
npm install
