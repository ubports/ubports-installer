const switchHide = (from, to) => {
  $("." + from).hide();
  $("." + to).show();
};

const hideAll = id => {
  $("." + id).hide();
};

const showAll = id => {
  $("." + id).show();
};

const show = (cat, id) => {
  hideAll(cat);
  $("#" + cat + "-" + id).show();
};

const setText = (cat, id, text) => {
  $("." + cat + "-" + id).text(text);
};

const animations = {
  hideAll: () => {
    $("#particles-foreground").hide();
    $("#particles-background").hide();
    $("#push-animation").hide();
    $("#download-animation").hide();
  },
  particles: () => {
    if (!localStorage.getItem("animationsDisabled")) {
      $("#particles-foreground").show();
      $("#particles-background").show();
      $("#push-animation").hide();
      $("#download-animation").hide();
    } else {
      animations.hideAll();
    }
  },
  download: () => {
    if (!localStorage.getItem("animationsDisabled")) {
      $("#download-animation").show();
      $("#push-animation").hide();
      $("#particles-foreground").hide();
      $("#particles-background").hide();
    } else {
      animations.hideAll();
    }
  },
  push: () => {
    if (!localStorage.getItem("animationsDisabled")) {
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
  underText: {
    set: text => {
      return $("#footer-bottom").text(text);
    }
  },
  speedText: {
    set: text => {
      if (text) return $("#footer-speed").text(" at " + text + " MB/s");
      else return $("#footer-speed").text("");
    }
  }
};

const modals = {
  show: modal => {
    $("#" + modal + "-modal").modal("show");
  },
  hide: modal => {
    $("#" + modal + "-modal").modal("hide");
  }
};

$("#help").click(() => {
  ipcRenderer.send("createBugReport");
});

$("#donate").click(() => {
  shell.openExternal("https://ubports.com/donate");
});

ipcRenderer.on("user:write:progress", (e, length) => {
  if (length >= 100) {
    length = 100;
  }
  $("#progress").show();
  $("#progress").width(length.toString() + "%");
});

ipcRenderer.on("user:write:status", (e, status, waitDots) => {
  footer.topText.set(status, waitDots);
});

ipcRenderer.on("user:write:under", (e, status) => {
  footer.underText.set(status, true);
});

ipcRenderer.on("user:write:speed", (e, speed) => {
  footer.speedText.set(speed);
});

ipcRenderer.on("animations:hide", animations.hideAll);

ipcRenderer.on("localstorage:set", (e, item, value) => {
  if (value) localStorage.setItem(item, value);
  else localStorage.removeItem(item);
});

views.show("working", "particles");
