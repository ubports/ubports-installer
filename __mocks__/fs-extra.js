const fs = {
  ensureDir: jest.fn().mockResolvedValue(),
  copyFile: jest.fn().mockResolvedValue(),
  emptyDir: jest.fn(),
  readdirSync: jest.fn().mockReturnValue([])
};

module.exports = fs;
