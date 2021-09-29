const dl = {
  checkFile: jest.fn().mockResolvedValue(true),
  download: jest.fn().mockImplementation((files, progress, next, activity) =>
    Promise.resolve().then(() => {
      activity("preparing");
      activity("downloading");
      next(0, files.length);
      progress(0, 0);
      progress(0.5, 5);
      files.forEach((f, i) => next(i + 1, files.length));
      progress(1);
    })
  )
};

module.exports = dl;
