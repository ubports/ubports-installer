<script>
  import { createEventDispatcher } from 'svelte';
  const { shell, ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';
  import { showDeveloperModeModal } from '../../stores.mjs';

  export let oemUnlockData;

  let showUnlockProgress = false;

  let lockCodeInput;

  const dispatch = createEventDispatcher();

  const close = () => dispatch('close');

  function handleUnlockButton() {
    ipcRenderer.send(
      "user:oem-lock:ok",
      lock_code_url ? lockCodeInput : null
    );
    showUnlockProgress = true;
    close();
  }
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">
    Bootloader locked
  </h4>
  <div slot="content">
    {#if oemUnlockData.enable}
    <p>
      Your device's bootloader is locked, that means installation of third party operating systems like Ubuntu Touch is disabled.
    </p>
    <b>
      Removing this lock might void the warranty. If you want to be sure, please ask your manufacturer or vendor if they allow this. UBports is not responsible and won't replace devices in case of warranty loss. You are responsible for your own actions.
    </b>
    <p>
      Do you want to unlock your device now?
    </p>
    <p>
      You might see a confirmation dialog on your device next.
    </p>
    {:else}
      <p>
        Your device could not be unlocked. Please make sure OEM unlocking is enabled in the devices' <a href on:click|preventDefault={() => showDeveloperModeModal.set(true)}>developer options</a>. After that, you can select the button below to continue the installation.
      </p>
    {/if}
    {#if oemUnlockData.url}
      <p>
        You have to obtain an unlocking code from <a href on:click|preventDefault={() => shell.openExternal(oemUnlockData.url)}>your vendor</a>. Please enter the code below and click the button to continue.
      </p>
      <input type="text" placeholder="unlock code" bind:value={lockCodeInput}>
    {/if}
  </div>
  <div slot="actions">
    <button on:click={close}>Abort</button>
    <button on:click={() => handleUnlockButton}>Unlock</button>
    {#if showUnlockProgress}
      <i class="fa fa-cog fa-spin fa-2x fa-fw"></i>
    {/if}
  </div>
</Modal>