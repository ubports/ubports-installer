<script>
  import { createEventDispatcher } from "svelte";
  import { osInstructsData, settings } from "../../../stores.mjs";
  const { shell, ipcRenderer } = require("electron");
  import Modal from "./Modal.svelte";

  const dispatch = createEventDispatcher();

  const close = () => {
    ipcRenderer.send("options", $settings);
    dispatch("close");
  };
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">Install options</h4>
  <div slot="content">
    <div>
      {#each $osInstructsData as osInstruction}
        <div class="row">
          <label for="" class="col-3 col-form-label">{osInstruction.name}</label
          >
          <div class="col-9 d-flex align-items-center">
            {#if osInstruction.type === "select"}
              <select
                class="form-select"
                bind:value={$settings[osInstruction.var]}
              >
                {#each osInstruction.values as value}
                  <option value={value.value}>{value.label}</option>
                {/each}
              </select>
            {:else if osInstruction.type === "checkbox"}
              <input
                class="form-check-input"
                type="checkbox"
                bind:value={$settings[osInstruction.var]}
                checked={osInstruction.value}
              />
            {/if}
          </div>
        </div>
        {#if osInstruction.tooltip}
          <dl class="row">
            <dt class="col-3" />
            <dd class="col-9">
              {osInstruction.tooltip}
              {#if osInstruction.link}
                <a
                  href
                  on:click|preventDefault={() =>
                    shell.openExternal(osInstruction.link)}>More...</a
                >
              {/if}
            </dd>
          </dl>
        {/if}
      {/each}
    </div>
    <p>
      <b>NOTE</b>: Installing may in rare cases lead to data loss. If the device
      is running Android, please note that you won't be able to access your
      Android data and/or apps in Ubuntu Touch. However the Android data will
      use storage space, so if you don't want it, please select the "Wipe"
      option. It's always wise to backup before installing.
    </p>
  </div>
  <div slot="actions">
    <button id="btn-options-close" class="btn btn-default" on:click={close}
      >Next</button
    >
  </div>
</Modal>
