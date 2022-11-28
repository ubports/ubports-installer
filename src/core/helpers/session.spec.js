const Session = require("./session.js");
const session = new Session();

describe("Session", () => {
  it("should have store", () => {
    expect(session.store).toBeInstanceOf(Map);
  });
  it("should store", () => {
    session.set("fastboot:boot", { partition: "recovery" });
    session.set("adb:shell");
    session.set("adb:shell", null, "some error");
    session.set("adb:shell");
    expect(Object.fromEntries(session.get())).toEqual({
      "adb:shell": { error: "some error", args: null },
      "fastboot:boot": { args: { partition: "recovery" }, error: null }
    });
    expect(session.getActionsDebugInfo()).toEqual(
      "fastboot:boot: OK\n" +
        '  {"partition":"recovery"}\n' +
        "adb:shell: some error\n"
    );
  });
});
