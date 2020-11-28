<script>
  import { createEventDispatcher } from 'svelte';
  const { ipcRenderer, shell } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  function dismissDrivers() {
    ipcRenderer.invoke("setSettingsValue", "never.windowsDrivers", true);
    close();
  }
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">
    Warning!
  </h4>
  <div slot="content">
    <p>
      You need to install the <a href on:click|preventDefault={() => shell.openExternal('https://adb.clockworkmod.com/')}>Universal ADB driver</a> or the alternative <a href on:click|preventDefault={() => shell.openExternal('https://adbdriver.com/downloads/')}>ADB driver</a> and re-start the program to continue with the installation.
      If you have already installed adb drivers, you can dismiss this message and simply continue with the installation.
    </p>
    <br>
    <p>
      If installer still does not detect your device, you might want to try installing <a href on:click|preventDefault={() => shell.openExternal('https://developer.android.com/studio/releases/')}>Android Studio</a> from Google. After that, you can specify custom adb and fastboot tools in the options in the next step.
    </p>
    <br>
    <p>
      As a last resort, we also have <a href on:click|preventDefault={() => shell.openExternal('https://devices.ubuntu-touch.io')}>manual installation instructions for every device</a>, that you can follow if you want to install without using the UBports Installer.
    </p>
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={close}>Dismiss</button>
    <button id="btn-driver-never-ask" class="btn btn-primary" on:click={() => dismissDrivers}>Don't ask me again</button>
  </div>
</Modal>