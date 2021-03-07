<script>
  import Modal from './Modal.svelte';
  const { shell, ipcRenderer } = require("electron");
  import { createEventDispatcher } from 'svelte';
  import { deviceSelectOptions } from '../../../stores.mjs';
      
  let device_selects;

  const unsubscribe = deviceSelectOptions.subscribe(value => {
    device_selects = value;
  });

  let selectedDevice;

  function selectDevice(device) {
    ipcRenderer.send("device:selected", device);
    close();
  }

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
    <h2 slot="header">
        Select your device
    </h2>
    <div slot="content">
        <form id="device-form" class="row">
                <label for="" class="col-3 form-label">Device</label>
                <div class="col-9">
                    <select class="form-control" bind:value={selectedDevice}>
                      {#each device_selects as deviceSelect}
                        <option value={deviceSelect.value}>
                          {deviceSelect.name}
                        </option>
                      {/each}
                    </select>
                </div>
        </form>
        <p>
            Not all <a href on:click|preventDefault={() => shell.openExternal('https://devices.ubuntu-touch.io')}>Ubuntu Touch devices</a> are supported by the UBports Installer yet.
            You can find installation instructions for devices not listed here on <a href on:click|preventDefault={() => shell.openExternal('https://devices.ubuntu-touch.io')}>devices.ubuntu-touch.io</a>. 
            If you want to help, you can <a href on:click|preventDefault={() => shell.openExternal('https://github.com/ubports/installer-configs/blob/master/v1/_device.schema.json')}>contribute a config file</a> for any device and operating system!
        </p>
        <p>
            Please do not try to install other devices images on your device. <b>It will not work!</b>
        </p>
    </div>
    <div slot="actions">
      <button class="btn btn-primary" disabled={!selectedDevice} on:click={selectDevice(selectedDevice)}>Select</button>
    </div>
</Modal>
    