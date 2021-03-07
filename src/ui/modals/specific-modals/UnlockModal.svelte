<script>
  import { createEventDispatcher } from 'svelte';
  const { ipcRenderer, shell } = require("electron");
  import Modal from './Modal.svelte';

  export let unlockData;

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
      <div class=row>
        <label for="" class="col-3 form-label">{unlockData[action].title}</label>
        <div class="col-9">
          <p>{unlockData[action].description}</p>
        </div>
        {#if unlockData[action].link}
          <div class="col-3">
            <p class="col-9">
              <a href on:click|preventDefault={() => shell.openExternal(unlockData[action].link)}>More...</a>
            </p>
          </div>
        {/if}
      </div>
      {/each}
    </div>
  </div>
  <div slot="actions">
    <button class="btn btn-primary" on:click={() => handleUnlockModalButton()}>Ok</button>
  </div>
</Modal>