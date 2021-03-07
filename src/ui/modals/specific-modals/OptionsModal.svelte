<script>
  import { createEventDispatcher } from 'svelte';
  import { osInstructsData } from '../../../stores.mjs';
  const { shell, ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  let inputValues = [];

  const close = () => {
    for (const osInstruction of $osInstructsData) {
      console.log(osInstruction)
      ipcRenderer.send("option", osInstruction.var, inputValues[osInstruction]);
    }
    setTimeout(() => ipcRenderer.send('install'), 250);
    dispatch('close');
  }
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Install options
  </h4>
  <div slot="content">
    <div>
      <form action="">
        {#each $osInstructsData as osInstruction, osInstructsCounter}
        <div class="row">
          <label for="" class="col-3 form-label">{osInstruction.name}</label>
          <div class="col-9">
            {#if osInstruction.type === "select"}
            <select class="form-control" bind:value={inputValues[osInstructsCounter]}>
              {#each osInstruction.values as value}
              <option value={value.value}>{value.label}</option>
              {/each}
            </select>
            {:else}
              {#if osInstruction.type === "checkbox"}
              <input class="form-check-input" type="checkbox" bind:value={inputValues[osInstructsCounter]} checked={osInstruction.value}>
              <!-- {:else} -->
              <!-- <input type="{osInstruction.type}" class="form-control space" bind:value={inputValues[osInstructsCounter]}> -->
              {/if}
            {/if}
          </div>
        </div>
        <div class="row">
          {#if osInstruction.tooltip}
          <div class="col-3"></div>
          <p class="col-9">
            {osInstruction.tooltip}
            {#if osInstruction.link}
            <a href on:click|preventDefault={() => shell.openExternal(osInstruction.link)}>More...</a>
            {/if}
          </p>
          {/if}
        </div>
        {/each}
      </form>
    </div>
    <p>
      <b>NOTE</b>: Installing may in rare cases lead to data loss. If the device is running Android, please note that you won't be able to access your Android data and/or apps in Ubuntu Touch. However the Android data will use storage space, so if you don't want it, please select the "Wipe" option. It's always wise to backup before installing.
    </p>
  </div>
  <div slot="actions">
    <button id="btn-options-close" class="btn btn-default" on:click={() => close()}>Next</button>
  </div>
</Modal>