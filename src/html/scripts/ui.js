const switchHide = (from, to) => {
  const elementsToHide = document.getElementsByClassName(from);
  elementsToHide.forEach(el => (el.display = "none"));
  const elementsToDisplay = document.getElementsByClassName(to);
  elementsToDisplay.forEach(el => (el.style.display = "block"));
};

const hideAll = id => {
  const elementsToHide = document.getElementsByClassName(id);
  elementsToHide.forEach(el => (el.style.display = "none"));
};

const showAll = id => {
  const elementsToDisplay = document.getElementsByClassName(id);
  elementsToDisplay.forEach(el => (el.style.display = "block"));
};

const show = (cat, id) => {
  hideAll(cat);
  document.getElementById(`#${cat}-${id}`).style.display = "block";
};

const setText = (cat, id, text) => {
  const elements = document.getElementsByClassName(`.${cat}-${id}`);
  elements.forEach(el => (el.innerText = text));
};
const animations = {
  hideAll: () => {
    document.getElementById("#particles-foreground").style.display = "none";
    document.getElementById("#particles-background").style.display = "none";
    document.getElementById("#push-animation").style.display = "none";
    document.getElementById("#download-animation").style.display = "none";
  },
  particles: () => {
    if (!localStorage.getItem("animationsDisabled")) {
      document.getElementById("#particles-foreground").style.display = "block";
      document.getElementById("#particles-background").style.display = "block";
      document.getElementById("#push-animation").style.display = "none";
      document.getElementById("#download-animation").style.display = "none";
    } else {
      animations.hideAll();
    }
  },
  download: () => {
    if (!localStorage.getItem("animationsDisabled")) {
      document.getElementById("#download-animation").style.display = "block";
      document.getElementById("#push-animation").style.display = "none";
      document.getElementById("#particles-foreground").style.display = "none";
      document.getElementById("#particles-background").style.display = "none";
    } else {
      animations.hideAll();
    }
  },
  push: () => {
    if (!localStorage.getItem("animationsDisabled")) {
      document.getElementById("#push-animation").style.display = "block";
      document.getElementById("#download-animation").style.display = "none";
      document.getElementById("#particles-foreground").style.display = "none";
      document.getElementById("#particles-background").style.display = "none";
    } else {
      animations.hideAll();
    }
  }
};

const addClass = (selector, classToAdd) => {
  if (
    (!selector && typeof selector !== "string") ||
    (!classToAdd && typeof classToAdd !== "string")
  )
    return;

  const elements = document.getElementsByClassName(selector);

  //adding Class
  elements.forEach(el => (el.className += classToAdd));
};

const removeClass = (selector, classToRemove) => {
  if (
    (!selector && typeof selector !== "string") ||
    (!classToRemove && typeof classToRemove !== "string")
  )
    return;

  const elements = document.getElementsByClassName(selector);
  //removing
  elements.forEach(el => {
    const classToRemove = classToRemove;
    if (el.classList) return el.classList.remove(classToRemove);

    const reg = new RegExp("(\\s|^)" + classToRemove + "(\\s|$)");
    el.className = el.className.replace(reg, " ");
  });
};

const views = {
  hideAll: () => hideAll("views"),
  show: (id, animation) => {
    if (id != "working") {
      if (id == "done") {
        addClass(".ubp-robot", "ubp-robot-side");
        removeClass(".ubp-robot", "ubp-robot-foot");
      } else {
        removeClass(".ubp-robot", "ubp-robot-side");
        addClass(".ubp-robot", "ubp-robot-foot");
      }
      animations.hideAll();
      show("views", id);
      return;
    } else {
      removeClass(".ubp-robot", "ubp-robot-side");
      removeClass(".ubp-robot", "ubp-robot-foot");
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
      const awaitDot = document.getElementById("#wait-dot");
      const footerTop = document.getElementById("#footer-top");

      if (dots) awaitDot.style.dispay = "block";
      else awaitDot.style.dispay = "none";
      return (footerTop.innerText = text);
    }
  },
  underText: {
    set: text => {
      return (document.getElementById("#footer-bottom").innerText = text);
    }
  },
  speedText: {
    set: text => {
      const footerSpeed = document.getElementById("#footer-speed");
      if (text) return (footerSpeed.innerText = ` at ${text} MB/s`);
      else return (footerSpeed.innerText = "");
    }
  }
};

const modals = {
  show: modal => {
    document.getElementById(`#${modal}-modal`).modal("show");
  },
  hide: modal => {
    document.getElementById(`#${modal}-modal`).modal("hide");
  }
};

document.getElementById("#help").onclick = () => {
  ipcRenderer.send("createBugReport", "user-requested bug-report");
};

document.getElementById("#donate").onclick = () => {
  shell.openExternal("https://ubports.com/donate");
};

ipcRenderer.on("user:write:progress", (e, length) => {
  if (length >= 100) {
    length = 100;
  }
  const progress = document.getElementById("#progress");
  progress.style.display = `block`;
  progress.setAttribute("width", `${length.toString()}%`);
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
