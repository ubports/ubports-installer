<script>
  import { createEventDispatcher } from 'svelte';
  import Modal from './Modal.svelte';

  const { shell, ipcRenderer } = require("electron");

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  function dismissUdev(set) {
    ipcRenderer.invoke("setSettingsValue", "never.udev", true);
    if (set) {
      ipcRenderer.send("udev");
    }
    close();
  }
</script>

<Modal showCloseButton={false} on:close={close}>
  <h4 slot="header">
    Warning!
  </h4>
  <div slot="content">
    <p>
      The installer needs to have the appropriate udev rules set to be able to communicate with devices over adb or fastboot. Click the button below to have the installer set up the rules automatically. You will be prompted to authorize this with your admin password.
      <br>
      Alternatively, you can choose to do this <a href on:click|preventDefault={() => shell.openExternal('https://docs.ubports.com/en/latest/userguide/install.html#missing-udev-rules')}>manually</a> through the command-line.
    </p>
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={close}>Dismiss</button>
    <button class="btn btn-default" on:click={() => dismissUdev(false)}>Don't ask me again</button>
    <button class="btn btn-primary" on:click={() => dismissUdev(true)}>Set up rules automatically.</button>
  </div>
</Modal>