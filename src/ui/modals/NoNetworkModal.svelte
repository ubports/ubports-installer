<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const { ipcRenderer, shell } = require("electron");

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  function handleButtonClick() {
    ipcRenderer.send('restart');
    close();
  }
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">
    Internet connection lost
  </h4>
  <div slot="content">
    <p>
      The installer failed to connect to the UBports servers. Are you connected to the internet? If you're using a proxy, you might have to <a href on:click|preventDefault={() => shell.openExternal('https://www.golinuxcloud.com/set-up-proxy-http-proxy-environment-variable/')}>configure it</a> by setting the <b>https_proxy</b> environment variable.
    </p>
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={() => handleButtonClick}>Try again</button>
  </div>
</Modal>