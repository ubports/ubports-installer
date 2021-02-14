<script>
  import { createEventDispatcher } from 'svelte';
  const { ipcRenderer, shell } = require("electron");
  import Modal from './Modal.svelte';

  export let unlockData;
  console.log('Unlock Data', Object.keys(unlockData))

  const dispatch = createEventDispatcher();
  
  function handleUnlockModalButton() {
    ipcRenderer.send('user:unlock:ok')
    close();
  }
  
  const close = () => dispatch('close');
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">
    Read before installing!
  </h4>
  <div slot="content">
    <div id="actions">
      {#each Object.keys(unlockData) as action}
      <div class="form-group">
        <label for="" class="col-xs-3 control-label">{unlockData[action].title}</label>
        <div class="col-xs-9">
          <p>{unlockData[action].description}</p>
        </div>
      </div>
      {#if unlockData[action].link}
        <div class="col-xs-3">
          <p class="col-xs-9">
            <a href on:click|preventDefault={() => shell.openExternal(unlockData[action].link)}>More...</a>
          </p>
        </div>
      {/if}
      {/each}
    </div>
  </div>
  <div slot="actions">
    <button class="btn btn-primary" on:click={() => handleUnlockModalButton()}>Ok</button>
  </div>
</Modal>