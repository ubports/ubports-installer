const openCutsReporter = {
  OpenCutsReporter: jest.fn().mockReturnValue({
    smartRun: jest.fn()
  })
};

module.exports = openCutsReporter;
