<script>
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";

  const { ipcRenderer } = require("electron");
  const { package: packageType } = require("../package.json"); // needs to be dynamic, because this injected into package.json while packaging and will not yet be set at compile time

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">Update available!</h4>
  <div slot="content">
    <p>
      You are not running the latest stable version. Using the latest stable
      release is recommended for most users. You can still use this version, but
      there might be bugs and issues that do not affect the stable release.
    </p>
    {#if packageType === "snap"}
      <p>
        Run <code>snap refresh ubports-installer --stable</code> in your terminal
        to install the latest version.
      </p>
    {:else}
      <p>Click the button below to download the latest version.</p>
    {/if}
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={close()}>Dismiss</button>
    {#if packageType !== "snap"}
      <button
        class="btn btn-primary"
        on:click={() => ipcRenderer.send("update")}>Download</button
      >
    {/if}
  </div>
</Modal>
