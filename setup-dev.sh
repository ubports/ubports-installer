#!/bin/bash

distro=$(lsb_release -si)
version=$(lsb_release -sr)

isNodeInstalled=false
isNpmInstalled=false

echo "The script will try to install nodejs and npm on the machine."
if command -v node &> /dev/null
then
    echo "nodejs is already installed on the machine"
    isNodeInstalled=true
fi
if command -v npm &> /dev/null
then
    isNpmInstalled=true
    echo "npm is already installed on the machine."
fi
if [ "$isNodeInstalled" = true ] && [ "$isNpmInstalled" = true ]
then
    echo "both node and npm is already installed on the machine.Nothing more to install."
    exit
fi

packageCommand="apt install"
case "${distro}" in
    "Arch")
        packageCommand="pacman -S"
        packages="npm nodejs"
        ;;
    "openSUSE")
        packages="npm nodejs"
        ;;
    "Ubuntu")
        if [[ ${version:0:2} -gt 19 ]]; then
            packages="npm nodejs libgconf-2-4"
        elif [[ ${version:0:2} -ge 18 ]]; then
            packages="npm nodejs libgconf2-4"
        fi
        ;;
    "Fedora")
        if [[ ${version} -ge 18 ]]; then
            packageCommand="dnf install"
        else
            packageCommand="yum install"
        fi
        packages="npm nodejs"
        ;;
    "VoidLinux")
        packageCommand="xbps-install"
        packages="nodejs"
        ;;
    "*")
        packages="npm nodejs-legacy"
        echo "Distro could not be identified. Please add yours to the script."
        echo "  Falling back to attempt default packages using apt"
        ;;
esac

echo "Installing nodejs..."
sudo ${packageCommand} ${packages}
if [[ ${?} -ne 0 ]]; then
    echo "Failed to install packages. Please troubleshoot and try again"
    exit 1
fi

echo "Setting up node modules..."
npm install

echo "Dev setup complete. Thank you for hacking on the UBports Installer!"
