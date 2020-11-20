const electron = {
  app: {
    on: jest.fn(),
    getPath: jest.fn(),
    getVersion: jest.fn()
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  shell: jest.fn(),
  Menu: jest.fn()
};

module.exports = electron;
