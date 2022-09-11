const Session = require("./session.js");
const session = new Session();

describe("Session", () => {
  it("should have store", () => {
    expect(session.store).toBeInstanceOf(Map);
  });
  it("should store", () => {
    session.push("fastboot:boot", { partition: "recovery" });
    session.push("adb:shell");
    session.push("adb:shell", null, "some error");
    session.push("adb:shell");
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
