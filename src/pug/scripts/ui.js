const animations = {
  particles: async () => {
    if (await ipcRenderer.invoke("getSettingsValue", "animations")) {
      $("#particles-foreground").show();
      $("#particles-background").show();
      $("#push-animation").hide();
      $("#download-animation").hide();
    } else {
      animations.hideAll();
    }
  },
  download: async () => {
    if (await ipcRenderer.invoke("getSettingsValue", "animations")) {
      $("#download-animation").show();
      $("#push-animation").hide();
      $("#particles-foreground").hide();
      $("#particles-background").hide();
    } else {
      animations.hideAll();
    }
  },
  push: async () => {
    if (await ipcRenderer.invoke("getSettingsValue", "animations")) {
      $("#push-animation").show();
      $("#download-animation").hide();
      $("#particles-foreground").hide();
      $("#particles-background").hide();
    } else {
      animations.hideAll();
    }
  }
};

const views = {
  hideAll: () => hideAll("views"),
  show: (id, animation) => {
    if (id != "working") {
      if (id == "done") {
        $(".ubp-robot").addClass("ubp-robot-side");
        $(".ubp-robot").removeClass("ubp-robot-foot");
      } else {
        $(".ubp-robot").removeClass("ubp-robot-side");
        $(".ubp-robot").addClass("ubp-robot-foot");
      }
      animations.hideAll();
      show("views", id);
      return;
    } else {
      $(".ubp-robot").removeClass("ubp-robot-side");
      $(".ubp-robot").removeClass("ubp-robot-foot");
      show("views", "working");
      switch (animation) {
        case "particles":
          animations.particles();
          break;
        case "download":
          animations.download();
          break;
        case "push":
          animations.push();
          break;
        default:
          animations.hideAll();
      }
    }
  }
};

const userText = {
  set: (id, text) => setText("user", id, text),
  remove: id => setText("user", id, "")
};

const footer = {
  topText: {
    set: (text, dots) => {
      if (dots) $("#wait-dot").show();
      else $("#wait-dot").hide();
      return $("#footer-top").text(text);
    }
  },
  speedText: {
    set: text => {
      if (text) return $("#footer-speed").text(" at " + text + " MB/s");
      else return $("#footer-speed").text("");
    }
  }
};

views.show("working", "particles");
