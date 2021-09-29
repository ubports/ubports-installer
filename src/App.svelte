<script>
  //Electron imports
  const { ipcRenderer } = require("electron");

  //Store imports
  import {
    animationType,
    footerData,
    osSelectOptions,
    installConfigData,
    manualDownloadGroup,
    manualDownloadFileData,
    eventObject,
    userActionEventObject,
    actionData,
    deviceName,
    osInstructsData,
    settings
  } from "./stores.mjs";

  //Header
  import Header from "./ui/partials/Header.svelte";

  //Footer
  import Footer from "./ui/partials/Footer.svelte";
  let footer;

  //Yumi
  import Yumi from "./ui/partials/Yumi.svelte";
  let yumi;

  //Modals
  import Modals from "./ui/modals/Modals.svelte";

  //Routing
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import routes from "./routes.mjs";

  //Messages
  //Routing messages
  ipcRenderer.on("user:write:working", (e, animation) => {
    animationType.set(animation);
    push("/working");
    yumi.setPosition("center");
  });

  ipcRenderer.on("user:write:done", () => {
    push("/done");
    footer.resetProgress();
    yumi.setPosition("side");
  });

  ipcRenderer.on("user:device-unsupported", (event, device) => {
    footerData.set({
      topText: "Device not supported",
      underText: `The device ${device} is not supported`,
      waitingDots: false
    });
    deviceName.set(device);
    push("/not-supported");
    yumi.setPosition("foot");
  });

  ipcRenderer.on("user:action", (event, action) => {
    userActionEventObject.set(event);
    actionData.set(action);
    push("/user-action");
    yumi.setPosition("foot");
  });

  ipcRenderer.on("user:os", (event, installConfig, osSelects) => {
    global.installConfig = installConfig;
    global.installConfig.os_to_install = undefined;

    footerData.set({
      topText: `${installConfig.name} (${installConfig.codename})`,
      underText: "Please select an operating system for installation",
      waitingDots: false
    });

    osSelectOptions.set(osSelects);
    installConfigData.set(installConfig);
    push("/select-os");
    yumi.setPosition("foot");
  });

  ipcRenderer.on("user:manual_download", (event, file, group) => {
    manualDownloadGroup.set(group);
    manualDownloadFileData.set(file);
    eventObject.set(event);
    push("/manual-download");
    yumi.setPosition("foot");
  });

  ipcRenderer.on("user:configure", (event, osInstructs) => {
    osInstructsData.set(osInstructs);
    settings.set(
      osInstructs.reduce(
        (prev, curr) => ({
          [curr.var]: curr.values ? curr.values[0].value : curr.value || false,
          ...prev
        }),
        {}
      )
    );
    animationType.set("particles");
    push("/working");
    footerData.set({
      topText: `${installConfig.name} (${installConfig.codename})`,
      underText: "Please Configure the installation",
      waitingDots: false
    });
    yumi.setPosition("center");
  });

  //Error handling
  // Catch all unhandled errors in rendering process
  window.onerror = (err, url, line) => {
    ipcRenderer.send("renderer:error", err + " (MainRenderer:" + line + ")");
  };
</script>

<div class="app-wrapper">
  <Header />
  <div class="view-container container">
    <Router {routes} />
    <Modals />
  </div>
  <Footer bind:this={footer} />
  <Yumi bind:this={yumi} />
</div>

<style>
  .app-wrapper {
    position: relative;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .view-container {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    justify-content: center;
    padding: 2rem 1rem;
    height: 100%;
  }
</style>
