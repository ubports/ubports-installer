<script>
  import { createEventDispatcher } from 'svelte';
  const { ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();
  
  function handleUnlockModalButton() {
    ipcRenderer.send('user:unlock:ok')
    close();
  }
  
  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Read before installing!
  </h4>
  <div slot="content">
    <div id="actions">

    </div>
  </div>
  <div slot="actions">
    <button id="btn-unlock-modal" class="btn btn-primary" on:click={() => handleUnlockModalButton}>Ok</button>
  </div>
</Modal>