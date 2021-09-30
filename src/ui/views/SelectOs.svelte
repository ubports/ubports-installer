<script>
  const { ipcRenderer } = require("electron");

  import {
    osSelectOptions,
    installConfigData,
    showDeveloperModeModal
  } from "../../stores.mjs";

  let selectedOs;

  function handleInstallButton() {
    ipcRenderer.send("os:selected", selectedOs);
  }
</script>

<div class="row">
  <div class="col-6">
    <img
      src="./screens/Screen6.jpg"
      alt="Screen6"
      style="height: 350px; margin: auto; display: flex;"
    />
  </div>
  <div class="col-6">
    <h4 style="font-weight: bold;">
      {$installConfigData.name} ({$installConfigData.codename})
    </h4>
    <p>
      <a
        href={`https://devices.ubuntu-touch.io/device/${$installConfigData.codename}`}
        >about this device</a
      >
      <a
        href={`https://github.com/ubports/installer-configs/blob/master/v2/devices/${$installConfigData.codename}.yml`}
        >view config file</a
      >
    </p>
    <p>
      Please make sure you enabled <a
        href
        on:click|preventDefault={() => showDeveloperModeModal.set(true)}
        >developer mode and OEM unlocking</a
      >.
    </p>
    <p>What operating system do you want to install?</p>
    <div class="form row">
      <div class="col-3">
        <label for="" class="col-form-label">OS</label>
      </div>
      <div class="col-9">
        <select class="form-select" bind:value={selectedOs}>
          {#each $osSelectOptions as osSelect}
            <option value={osSelect.value}>
              {osSelect.name}
            </option>
          {/each}
        </select>
      </div>
    </div>
    <button
      class="btn btn-primary mt-3"
      style="width: 100%;"
      on:click={() => handleInstallButton()}
    >
      Install
    </button>
  </div>
</div>
