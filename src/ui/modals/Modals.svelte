<script>
  const { ipcRenderer } = require("electron");

  import NewUpdateModal from "./specific-modals/NewUpdateModal.svelte";
  import UdevModal from "./specific-modals/UdevModal.svelte";
  import ConnectionLostModal from "./specific-modals/ConnectionLostModal.svelte";
  import NoNetworkModal from "./specific-modals/NoNetworkModal.svelte";
  import LowPowerModal from "./specific-modals/LowPowerModal.svelte";
  import Msvc2012x86Modal from "./specific-modals/Msvc2012x86Modal.svelte";
  import SelectDeviceModal from "./specific-modals/SelectDeviceModal.svelte";
  import DeveloperModeModal from "./specific-modals/DeveloperModeModal.svelte";
  import ErrorModal from "./specific-modals/ErrorModal.svelte";
  import UnlockModal from "./specific-modals/UnlockModal.svelte";
  import OemLockModal from "./specific-modals/OemLockModal.svelte";
  import ResultModal from "./specific-modals/ResultModal.svelte";
  import PromptModals from "./specific-modals/PromptModals.svelte";

  import {
    showSelectDeviceModal,
    showDeveloperModeModal,
    deviceSelectOptions
  } from "../../stores.mjs";

  let showNewUpdateModal = false;
  let showUdevModal = false;
  let showConnectionLostModal = false;
  let showNoNetworkModal = false;
  let showLowPowerModal = false;
  let showMsvc2012x86Modal = false;
  let showErrorModal = false;
  let showUnlockModal = false;
  let showOemLockModal = false;
  let showResultModal = false;

  //Modal props
  let errorData;
  let unlockData;
  let oemUnlockData;
  let showDoNotAskAgainButton;

  //Modal related messages
  if (process.platform === "linux" && !process.env.SNAP) {
    ipcRenderer.invoke("getSettingsValue", "never.udev").then(never => {
      never ? null : setTimeout(() => (showUdevModal = true), 1000);
    });
  }

  ipcRenderer.on("user:report", (_, done) => {
    showDoNotAskAgainButton = done;
    showResultModal = true;
  });

  ipcRenderer.on("user:connection-lost", () => {
    showConnectionLostModal = true;
  });

  ipcRenderer.on("user:no-network", () => {
    showNoNetworkModal = true;
  });

  ipcRenderer.on("user:low-power", callback => {
    showLowPowerModal = true;
  });

  ipcRenderer.on("user:no-msvc2012x86", () => {
    showMsvc2012x86Modal = true;
  });

  ipcRenderer.on("user:update-available", () => {
    showNewUpdateModal = true;
  });

  ipcRenderer.on("user:error", (event, error) => {
    errorData = error;
    showErrorModal = true;
  });

  ipcRenderer.on("user:eula", (_, eula) => {
    unlockData = eula;
    showUnlockModal = true;
    console.log("eula", eula);
  });

  ipcRenderer.on("user:unlock", (_, unlock, user_actions) => {
    unlockData = user_actions;
    showUnlockModal = true;
  });

  ipcRenderer.on("user:prerequisites", (_, prerequisites, user_actions) => {
    unlockData = user_actions;
    showUnlockModal = true;
  });

  ipcRenderer.on("user:oem-lock", (event, enable = false, url) => {
    oemUnlockData = {
      enable: enable,
      url: url
    };
    showOemLockModal = true;
  });
</script>

<!-- low prio -->
{#if $showSelectDeviceModal}
  <SelectDeviceModal
    selectOptions={$deviceSelectOptions}
    on:close={() => showSelectDeviceModal.set(false)}
  />
{/if}
{#if showOemLockModal}
  <OemLockModal {oemUnlockData} on:close={() => (showOemLockModal = false)} />
{/if}
{#if $showDeveloperModeModal}
  <DeveloperModeModal on:close={() => showDeveloperModeModal.set(false)} />
{/if}

<!-- medium prio -->
{#if showUnlockModal}
  <UnlockModal {unlockData} on:close={() => (showUnlockModal = false)} />
{/if}
{#if showResultModal}
  <ResultModal
    {showDoNotAskAgainButton}
    on:close={() => (showResultModal = false)}
  />
{/if}

<!-- high prio -->
{#if showUdevModal}
  <UdevModal on:close={() => (showUdevModal = false)} />
{/if}
{#if showNewUpdateModal}
  <NewUpdateModal on:close={() => (showNewUpdateModal = false)} />
{/if}

<!-- errors -->
{#if showLowPowerModal}
  <LowPowerModal on:close={() => (showLowPowerModal = false)} />
{/if}
{#if showConnectionLostModal}
  <ConnectionLostModal on:close={() => (showConnectionLostModal = false)} />
{/if}
{#if showNoNetworkModal}
  <NoNetworkModal on:close={() => (showNoNetworkModal = false)} />
{/if}
{#if showMsvc2012x86Modal}
  <Msvc2012x86Modal on:close={() => (showMsvc2012x86Modal = false)} />
{/if}
<PromptModals />
{#if showErrorModal}
  <ErrorModal {errorData} on:close={() => (showErrorModal = false)} />
{/if}
