module.exports = jest.fn().mockReturnValue({
  get: jest.fn().mockResolvedValue(),
  set: jest.fn().mockResolvedValue(),
  clear: jest.fn().mockResolvedValue(),
  openInEditor: jest.fn().mockResolvedValue()
});
