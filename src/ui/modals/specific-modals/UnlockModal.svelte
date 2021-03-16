<script>
  import { createEventDispatcher } from "svelte";
  const { ipcRenderer, shell } = require("electron");
  import Modal from "./Modal.svelte";

  export let unlockData;

  const dispatch = createEventDispatcher();

  function handleUnlockModalButton() {
    ipcRenderer.send("user:unlock:ok");
    close();
  }

  const close = () => dispatch("close");
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">Read before installing!</h4>
  <div slot="content">
    <div id="actions">
      {#each Object.keys(unlockData) as action}
        <dl class="row">
          <dt class="col-3">{unlockData[action].title}</dt>
          <dd class="col-9">
            {unlockData[action].description}
          </dd>
          {#if unlockData[action].link}
            <dt class="col-3" />
            <dd class="col-9">
              <a
                href
                on:click|preventDefault={() =>
                  shell.openExternal(unlockData[action].link)}>More...</a
              >
            </dd>
          {/if}
        </dl>
      {/each}
    </div>
  </div>
  <div slot="actions">
    <button class="btn btn-primary" on:click={() => handleUnlockModalButton()}
      >Ok</button
    >
  </div>
</Modal>
