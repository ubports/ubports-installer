process.argv = [null, null, "-vv"];
const { ipcMain } = require("electron");
jest.mock("electron");

const sudo = require("sudo-prompt");
const udev = require("./udev.js");

it("should be a singleton", () => {
  expect(udev).toBe(require("./udev.js"));
});

it("should set rules", () => {
  sudo.exec.mockImplementation((command, options, cb) => cb());
  expect(udev.set()).toBe(undefined);
  expect(sudo.exec).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.any(Function)
  );
});

it("should fail silently", () => {
  sudo.exec.mockImplementation((command, options, cb) => cb("problem"));
  expect(udev.set()).toBe(undefined);
  expect(sudo.exec).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Object),
    expect.any(Function)
  );
});
