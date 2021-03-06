const electron = {
  app: {
    on: jest.fn(),
    getPath: jest.fn(),
    getVersion: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    once: jest.fn(),
    on: jest.fn(),
    handle: jest.fn()
  },
  shell: {
    openExternal: jest.fn()
  },
  Menu: {
    buildFromTemplate: jest.fn(),
    setApplicationMenu: jest.fn()
  },
  webContents: {
    fromId: jest.fn()
  }
};

module.exports = electron;
