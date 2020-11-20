const logger = {
  addColors: jest.fn(),
  format: {
    combine: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  },
  createLogger: jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    log: jest.fn()
  }))
};

module.exports = logger;
