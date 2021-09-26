<script>
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";

  const { ipcRenderer } = require("electron");

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");

  function handleReconnectButton() {
    console.log("Reconnect");
    ipcRenderer.send("reconnect");
    close();
  }
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">Connection to device lost</h4>
  <div slot="content">
    <p>
      The connection to your device was lost. Please make sure your device is
      still connected and do not disconnect your device again until the
      installation is finished.
      <br />
      If this continues to happen, you might want to try using a different USB cable.
      Old cables tend to become less reliable. Please try using a different USB cable
      and do not touch the device during the installation, unless you are prompted
      to do so.
    </p>
  </div>
  <div slot="actions">
    <button class="btn btn-primary" on:click={() => handleReconnectButton()}
      >Try again</button
    >
  </div>
</Modal>
