<script>
  const { ipcRenderer } = require("electron");
  import branding from "../../../branding.json";

  import {
    deviceSelectOptions,
    footerData,
    showDeveloperModeModal,
    showSelectDeviceModal
  } from "../../stores.mjs";

  ipcRenderer.on("device:wait:device-selects-ready", (event, deviceSelects) => {
    footerData.set({
      topText: "Waiting for device",
      underText: "Please connect your device with a USB cable",
      waitingDots: true
    });
    deviceSelectOptions.set(deviceSelects);
  });
</script>

<div class="row">
  <div class="col-6">
    <img
      src="../{branding.screens}/Screen1.jpg"
      alt="screen1"
      style="height: 350px; margin: auto;"
    />
  </div>
  <div class="col-6">
    <h4>Welcome to the {branding.appname}</h4>
    <p>
      We will walk you through the installation process. Don't worry, it's easy!
    </p>
    <p>
      With developer mode enabled, connect your phone, tablet, or smartwatch to
      the computer. Your device should be detected automatically.
    </p>
    <button
      id="btn-modal-dev-mode"
      class="btn btn-primary"
      on:click={() => showDeveloperModeModal.set(true)}
    >
      How do I enable developer mode?
    </button>
    <p>
      If your device is not detected automatically, you can select it manually
      to proceed. Please note that the {branding.appname} will only work on
      <a href={branding["supported-devices"]}>supported devices</a>.
    </p>
    <button
      id="btn-modal-select-device"
      class="btn btn-outline-dark"
      on:click={() => showSelectDeviceModal.set(true)}
    >
      Select device manually
    </button>
  </div>
</div>

<style>
  #btn-modal-dev-mode {
    margin-bottom: 10px;
  }

  button {
    width: 100%;
  }
</style>
