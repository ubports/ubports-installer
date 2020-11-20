<script>
    const { shell, ipcRenderer } = require("electron");

    import SelectDeviceModal from '../modals/SelectDeviceModal.svelte'

    let showDeviceModal = false;
    let selectOptions;

    ipcRenderer.on("device:wait:device-selects-ready", (event, deviceSelects) => {
    //   footer.topText.set("Waiting for device", true);
    //   footer.underText.set("Please connect your device with a USB cable");
      //if (!remote.getGlobal("installProperties").device) {
        selectOptions = deviceSelects;
      //} else {
        // if the device is set, just return the device:selected event
        // ipcRenderer.send("device:selected", remote.getGlobal("installProperties").device);
      //}
    });

    function openDeviceModal() {
        showDeviceModal = true;
        console.log(showDeviceModal);
    }

    function closeDeviceModal() {
        showDeviceModal = false;
        console.log(showDeviceModal);
    }
</script>

<div class="row">
    <div class="col-6">
        <img src="./screens/Screen1.jpg" alt="screen1" style="height: 350px; margin: auto;">
    </div>
    <div class="col-6">
        <h4>
            Please connect your device
        </h4>
        <p>
            Welcome to the UBports Installer! This tool will walk you through the Ubuntu Touch installation process. Don't worry, it's easy!
        </p>
        <p>
            Connect your device to the computer and enable developer mode. After that, your device should be detected automatically.
        </p>
        <button id="btn-modal-dev-mode" class="btn btn-primary">
            How do I enable developer mode?
        </button>
        <p>
            If your device is not detected automatically, you can select it manually to proceed. Please note that the UBports Installer will only work on
            <a href on:click|preventDefault={() => shell.openExternal('http://devices.ubuntu-touch.io')}>supported devices</a>.
            
        </p>
        <button id="btn-modal-select-device" class="btn btn-outline-dark" on:click={openDeviceModal}>
            Select device manually
        </button>
    </div>
</div>

{#if showDeviceModal}
	<SelectDeviceModal selectOptions={selectOptions} on:close={closeDeviceModal}/>
{/if}

<style>
    button {
        width: 100%;
    }
</style>
