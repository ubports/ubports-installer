"use strict";

/*

This file is a part of ubports-installer

Author: Marius Gripsgard <mariogrip@ubports.com>

*/

const electron = require('electron');
const electronPug = require('electron-pug');
const app = electron.app
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const adb = require("./adb")

const pug = new electronPug();
let mainWindow


function createWindow () {
  if (process.env.DEBUG)
    mainWindow = new BrowserWindow({width: 1600, height: 600, icon: path.join(__dirname, "../build/icons/icon.png")})
  else
    mainWindow = new BrowserWindow({width: 800, height: 600, icon: path.join(__dirname, "../build/icons/icon.png")})


  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.pug'),
    protocol: 'file:',
    slashes: true
  }))
  mainWindow.setMenu(null);

  if (process.env.DEBUG)
    mainWindow.webContents.openDevTools()

  mainWindow.on('closed', function () {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('uncaughtException', function (error) {
    console.log("CRAP!");
})

app.on('window-all-closed', function () {
  adb.stop(console.log)
  console.log("Good bye!")
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})
