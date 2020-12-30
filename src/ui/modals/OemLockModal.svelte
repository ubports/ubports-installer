<script>
  import { createEventDispatcher } from 'svelte';
  const { shell, ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Bootloader locked
  </h4>
  <div slot="content">

  </div>
  <div slot="actions">
    
  </div>
</Modal>