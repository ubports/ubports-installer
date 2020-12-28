<script>
  import { createEventDispatcher } from 'svelte';
import App from '../../App.svelte';
import ConnectionLostModal from './ConnectionLostModal.svelte';
import DeveloperModeModal from './DeveloperModeModal.svelte';
  const { shell, ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  const close = () => dispatch('close');

  let inputValue;
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Install options
  </h4>
  <div slot="content">
    <div>
      <form action="" id="options-form" class="form-horizontal">
        {#each osInstructs as osInstruction}
        <div class="form-group">
          <label for="" class="col-xs-3 control-label">option.name</label>
          <div class="col-xs-9">
            {#if option.type === "select"}
            <select name="" id="" class="form-control space" bind:value={inputValue}>
              {#each option.values as value}
            <option value={value.value}>{value.label}</option>
              {/each}
            </select>
            {:else}
              {#if option.type === "checkbox"}
              <input type="checkbox" bind:value={inputValue} checked={option.value}>
              {:else}
              <input type="{option.type}" class="form-control space" bind:value={inputValue}>
              {/if}
            {/if}
          </div>
          {#if option.tooltip}
          <div class="col-xs-3"></div>
          <p class="col-xs-9">
            {option.tooltip}
            {#if option.link}
            <a href on:click|preventDefault={() => shell.openExternal(option.link)}>More...</a>
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
    <button id="btn-options-close" class="btn btn-default" on:click={() => close}>Next</button>
  </div>
</Modal>

<!-- 
      // send data for this option to main for processing
      $("#btn-options-close").click(() => {
        if (option.type == "checkbox") {
          ipcRenderer.send("option", option.var, $("#options-" + option.var).is(":checked"));
        } else {
          ipcRenderer.send("option", option.var, $("#options-" + option.var).val());
        }
      });
    }
        
    let optionsAdded = false;        
    ipcRenderer.on("user:configure", (event, osInstructs) => {
      if (!optionsAdded) {
        optionsAdded = true;
        osInstructs.forEach(addOption);
      }
      views.show("working", "particles");
      footer.underText.set("Please Configure the installation");
      modals.show("options");
      $("#btn-options-close").click(() => {
        setTimeout(() => ipcRenderer.send('install'), 250);
      });
    }); -->
