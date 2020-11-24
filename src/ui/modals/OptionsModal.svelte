<script>
  import Modal from './Modal.svelte';

  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
  <h2 slot="header">

  </h2>
  <div slot="content">

  </div>
  <div slot="actions">
    
  </div>
</Modal>