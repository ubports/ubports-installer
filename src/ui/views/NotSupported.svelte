<script>
const { shell } = require("electron");
</script>

<div class="row">
    <div class="col-xs-6">
        <img src="../screens/Screen5.jpg" alt="Screen5" style='height: 350px; margin: auto; display: block;'>
    </div>
    <div class="col-xs-6">
        <h4 style='font-weight: bold;'>Device not supported</h4>
        <p>
            Your device:
            <span id="your-device"></span>
        </p>
        <p>
            <b>Sorry</b>
            , there is no port for this device yet!
        </p>
        <p>
            See
            <a href on:click|preventDefault={() => shell.openExternal('http://devices.ubuntu-touch.io')}>devices.ubuntu-touch.io</a>
            for more info
        </p>
        <hr>
        <h4 style='font-weight: bold;'>You want to try to install anyway?</h4>
        <p>
            You can try selecting your device manually, but please only do so if you're sure that your exact model is actually supported! You might also want to <a href on:click|preventDefault={() => shell.openExternal('http://devices.ubuntu-touch.io')}>file a bug</a>.
        </p>
        <button class="btn btn-default" style='width: 100%;' on:click|preventDefault={() => console.log('Open device select modal')}>Select device manually</button>
    </div>
</div>


    <!-- ipcRenderer.on("user:device-unsupported", (event, device) => {
      footer.topText.set("Device not supported");
      footer.underText.set("The device " + device + " is not supported");
      $("[id=your-device]").text(device);
      views.show("not-supported");
    }); -->
