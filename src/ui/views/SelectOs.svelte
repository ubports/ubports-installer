<script>
  const { shell, ipcRenderer } = require("electron");
  import { osSelectOptions, installConfigData } from '../../stores.mjs';
      
  let os_selects;
  let install_config;

  const unsubscribeOsSelects = osSelectOptions.subscribe(value => {
    os_selects = value;
  });

  const unsubscribeInstallConfig = installConfigData.subscribe(value => {
    install_config = value;
  });

  let selectedOs;

  function handleInstallButton() {
    ipcRenderer.send("os:selected", selectedOs); 
    global.installConfig.os_to_install = selectedOs;
  }
</script>

<div class="row">
    <div class="col-xs-6">
        <img src="./screens/Screen6.jpg" alt="Screen6" style='height: 350px; margin: auto; display: flex;'>
    </div>
    <div class="col-xs-6" style='height: 100%'>
    <h4 style='font-weight: bold;'>{install_config.name} ({install_config.codename})</h4>
        <p>
            <a href on:click|preventDefault={() => shell.openExternal(`https://devices.ubuntu-touch.io/device/${install_config.codename}`)}>about this device</a>
            <a href on:click|preventDefault={() => shell.openExternal(`https://github.com/ubports/installer-configs/blob/master/v1/${install_config.codename}.json`)}>view config file</a>
        </p>
        <p>
          Please make sure you enabled <a href on:click|preventDefault={null}>developer mode and OEM unlocking</a>.
          <!-- open developerModeModal with store -->
        </p>
        <p>
            What operating system do you want to install?
        </p>
        <form class="form-horizontal">
            <div class="form-group">
                <div class="col-xs-3">
                    <label for="options-os" class="control-label">OS</label>
                </div>
                <div class="col-xs-9">
                    <select id="options-os" name="options-os" class="form-control space" bind:value={selectedOs}>
                      {#each os_selects as osSelect}
                        <option value={osSelect.value}>
                          {osSelect.name}
                        </option>
                      {/each}
                    </select>
                </div>
            </div>
        </form>
        <button class="btn btn-primary" style='width: 100%; margin-top: 10px;' on:click={() => handleInstallButton}>
            Install
        </button>
    </div>
</div>