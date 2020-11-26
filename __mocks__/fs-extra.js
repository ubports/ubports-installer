const fs = {
  ensureDir: jest.fn(),
  emptyDir: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([])
};

module.exports = fs;
