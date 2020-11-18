const electron = {
  ipcMain: {
    on: jest.fn(),
    handle: jest.fn()
  },
  app: {
    getPath: jest.fn(),
    getVersion: jest.fn()
  }
};

module.exports = electron;
