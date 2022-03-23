const osInfo = jest.fn().mockResolvedValue({
  distro: "distro",
  release: "release",
  codename: "codename",
  platform: "platform",
  kernel: "kernel",
  arch: "arch",
  build: "build",
  servicepack: "servicepack"
});

module.exports.osInfo = osInfo;
