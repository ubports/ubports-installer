<script>
  const { ipcRenderer } = require("electron");

  import UdevModal from "./specific-modals/UdevModal.svelte";
  import NoNetworkModal from "./specific-modals/NoNetworkModal.svelte";
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

  let showUdevModal = false;
  let showNoNetworkModal = false;
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

  ipcRenderer.on("user:no-network", () => {
    showNoNetworkModal = true;
  });

  ipcRenderer.on("user:error", (event, error) => {
    errorData = error;
    showErrorModal = true;
  });

  ipcRenderer.on("user:unlock", (_, unlock, user_actions) => {
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

<!-- errors -->
{#if showNoNetworkModal}
  <NoNetworkModal on:close={() => (showNoNetworkModal = false)} />
{/if}
<PromptModals />
{#if showErrorModal}
  <ErrorModal {errorData} on:close={() => (showErrorModal = false)} />
{/if}
