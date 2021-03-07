<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const { ipcRenderer } = require("electron");

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  function handleRestartButtonClick() {
    ipcRenderer.send('restart');
    close();
  }
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">
    Low Power
  </h4>
  <div slot="content">
    <p>
      The battery of your device is critically low. This can cause severe Problems while flashing.
    </p>
    <b>
      Please let your device charge for a while and try again.
    </b>
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={() => handleRestartButtonClick}>
      Try again
    </button>
  </div>
</Modal>

