process.argv = [null, null, "-vv"];
const { Menu, shell } = require("electron");
jest.mock("electron");
const menuManager = require("./menuManager.js");

it("should be a singleton", () => {
  expect(require("./menuManager.js")).toBe(require("./menuManager.js"));
});

describe("MenuManager class", () => {
  describe("getMenuTemplate()", () => {
    it("should return template", () => {
      expect(menuManager.getMenuTemplate()).toBeDefined;
    });
    // TODO properly test submenues explicitly with assertions
    menuManager
      .getMenuTemplate({
        webContents: {
          openDevTools: jest.fn()
        }
      })
      .forEach(submenu =>
        describe(`${submenu.label} submenu`, () => {
          it("should specify items", () => {
            expect(submenu.submenu).toBeDefined;
          });
          submenu.submenu.forEach(item => {
            it(`'${item.label}' should work`, () => {
              if (item.click) expect(item.click()).returns;
              else expect(item.role).toBeDefined;
            });
          });
        })
      );
  });
  describe("setMenu()", () => {
    it("should set menu", () => {
      expect(menuManager.setMenu()).toEqual(undefined);
      expect(Menu.setApplicationMenu).toHaveBeenCalledTimes(1);
      expect(Menu.buildFromTemplate).toHaveBeenCalledTimes(1);
    });
  });
});
