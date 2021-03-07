<script>
    const { ipcRenderer, shell } = require("electron");
</script>

<div class="row">
    <div class="col-6">
        <img src="../screens/Screen6.jpg" alt="Screen6" style="height: 350px; margin: auto; display: block;">
    </div>
    <div class="col-6">
        <h4 style="font-weight: bold;">Success!</h4>
        <p>The installation process from the computer is done. The device will now perform the remaining steps which should take less than five minutes. After the installation, the device will reboot and you can begin to explore Ubuntu Touch.</p>
        <p>Found something you don't like?  <a href on:click|preventDefault={() => shell.openExternal('https://github.com/ubports/ubports-touch')}>Tell us</a>, or help us change it!</p>
        <p>
            Development of Ubuntu Touch is driven by the <a href on:click|preventDefault={()=> shell.openExternal('https://ubports.com')}>UBports Community</a>. Donate now to allow us to continue our mission!
            <button class="btn btn-default" style='width: 49%; margin-bottom: 10px; margin-right: 5px' on:click|preventDefault={() => shell.openExternal('https://ubports.com/join-us')}>Get involved</button> 
            <button class="btn btn-primary" style='width: 49%; margin-bottom: 10px;' on:click|preventDefault={() => shell.openExternal('https://ubports.com/donate')}>Donate</button>
        </p>
        <p>
            Got more devices you want to flash?
            <button class="btn btn-info" style='width: 100%;' on:click={() => ipcRenderer.send('restart')}>Flash another device!</button> 
        </p>
    </div>
</div>