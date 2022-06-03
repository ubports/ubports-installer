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
<SelectDeviceModal
  isOpen={$showSelectDeviceModal}
  selectOptions={$deviceSelectOptions}
  on:close={() => showSelectDeviceModal.set(false)}
/>
<DeveloperModeModal
  isOpen={$showDeveloperModeModal}
  on:close={() => showDeveloperModeModal.set(false)}
/>

<!-- medium prio -->
<ResultModal
  isOpen={showResultModal}
  {showDoNotAskAgainButton}
  on:close={() => (showResultModal = false)}
/>

<!-- high prio -->
<UdevModal isOpen={showUdevModal} on:close={() => (showUdevModal = false)} />

<!-- errors -->
<PromptModals />
<ErrorModal
  isOpen={showErrorModal}
  {errorData}
  on:close={() => (showErrorModal = false)}
/>
