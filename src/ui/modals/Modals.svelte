<script>
  const { ipcRenderer } = require("electron");

  import UdevModal from "./specific-modals/UdevModal.svelte";
  import SelectDeviceModal from "./specific-modals/SelectDeviceModal.svelte";
  import DeveloperModeModal from "./specific-modals/DeveloperModeModal.svelte";
  import ErrorModal from "./specific-modals/ErrorModal.svelte";
  import ResultModal from "./specific-modals/ResultModal.svelte";
  import PromptModals from "./specific-modals/PromptModals.svelte";

  import {
    showSelectDeviceModal,
    showDeveloperModeModal,
    deviceSelectOptions
  } from "../../stores.mjs";

  let showUdevModal = false;
  let showErrorModal = false;
  let showResultModal = false;

  //Modal props
  let errorData;
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

  ipcRenderer.on("user:error", (event, error) => {
    errorData = error;
    showErrorModal = true;
  });
</script>

<!-- low prio -->
{#if $showSelectDeviceModal}
  <SelectDeviceModal
    selectOptions={$deviceSelectOptions}
    on:close={() => showSelectDeviceModal.set(false)}
  />
{/if}
{#if $showDeveloperModeModal}
  <DeveloperModeModal on:close={() => showDeveloperModeModal.set(false)} />
{/if}

<!-- medium prio -->
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
<PromptModals />
{#if showErrorModal}
  <ErrorModal {errorData} on:close={() => (showErrorModal = false)} />
{/if}
