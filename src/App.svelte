<script>
  //Electron imports
  const { remote, ipcRenderer, shell } = require("electron");

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
    osInstructsData
  } from "./stores.mjs";

  //Footer
  import Footer from "./ui/partials/Footer.svelte";
  let footer;

  //Yumi
  import Yumi from "./ui/partials/Yumi.svelte";
  let yumi;

  //Modals
  import Modals from "./ui/modals/Modals.svelte";
  import OptionsModal from "./ui/modals/specific-modals/OptionsModal.svelte";
  import ResultModal from "./ui/modals/specific-modals/ResultModal.svelte";

  //Routing
  import Router from "svelte-spa-router";
  import { push } from "svelte-spa-router";
  import routes from "./routes.mjs";

  //Variables
  //Global variables
  global.installProperties = remote.getGlobal("installProperties");
  global.packageInfo = remote.getGlobal("packageInfo");

  //Modal variables
  let showOptionsModal = false;
  let showResultModal = false;
  let showDoNotAskAgainButton;

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
      underText: `The device ${device} is not supported`
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
      underText: "Please select an operating system for installation"
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
    animationType.set("particles");
    push("/working");
    footerData.set({
      topText: `${installConfig.name} (${installConfig.codename})`,
      underText: "Please Configure the installation"
    });
    yumi.setPosition("center");
    showOptionsModal = true;
  });

  ipcRenderer.on("user:report", (_, done) => requestReport(done));

  //Other methods
  function requestReport(done = false) {
    done ? (showDoNotAskAgainButton = true) : (showDoNotAskAgainButton = true);
    showResultModal = true;
  }

  //Error handling
  // Catch all unhandled errors in rendering process
  window.onerror = (err, url, line) => {
    ipcRenderer.send("renderer:error", err + " (MainRenderer:" + line + ")");
  };
</script>

<div class="app-wrapper">
  <div class="header">
    <h3 id="header-text" class="installer">
      UBports Installer {global.packageInfo.version}
    </h3>
    <div class="header-buttons-wrapper">
      <button
        id="help"
        class="help-button btn btn-primary"
        on:click={requestReport}>Report a bug</button
      >
      <button
        id="donate"
        class="donate-button btn btn-primary"
        on:click|preventDefault={() =>
          shell.openExternal("https://ubports.com/donate")}>Donate</button
      >
    </div>
  </div>
  <div class="view-container container">
    <Router {routes} />
    <Modals />
    {#if showOptionsModal}
      <OptionsModal on:close={() => (showOptionsModal = false)} />
    {/if}
    {#if showResultModal}
      <ResultModal
        {showDoNotAskAgainButton}
        on:close={() => (showResultModal = false)}
      />
    {/if}
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

  .header {
    display: flex;
    flex: 1 1 auto;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    height: 60px;
    max-height: 60px;
    padding: 0 10px 0 10px;
    background-color: #f5f5f5;
  }

  .header-buttons-wrapper button:first-of-type {
    margin-right: 10px;
  }

  .view-container {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    padding: 20px 10px;
  }
</style>
