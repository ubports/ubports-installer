<script>

</script>

<div class="row">
    <div class="col-xs-6">
        <img src="../screens/Screen6.jpg" alt="Screen6" style='height: 350px; margin: auto; display: block;'>
    </div>
    <div class="col-xs-6" style='height: 100%'>
        <h4 style='font-weight: bold;'>Device</h4>
        <p>
            <a href>about this device</a><a href>view config file</a>
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
                    <select id="options-os" name="options-os" class="form-control space">

                    </select>
                </div>
            </div>
        </form>
        <button class="btn btn-primary" style='width: 100%; margin-top: 10px;'>
            Install
        </button>
    </div>
</div>

<!-- 
onclick="ipcRenderer.send(\"os:selected\", getElementById('options-os').selectedIndex); global.installConfig.os_to_install = getElementById('options-os').selectedIndex;")

    ipcRenderer.on("user:os", (event, installConfig, osSelects) => {
      global.installConfig = installConfig;
      global.installConfig.os_to_install = undefined;
      footer.topText.set(installConfig.name+" ("+installConfig.codename+")");
      footer.underText.set("Please select an operating system for installation");
      $("#options-os").append(osSelects);
      $("#device-name").text(installConfig.name+" ("+installConfig.codename+")");
      $("#device-page-link").click(() => {
        shell.openExternal("https://devices.ubuntu-touch.io/device/" + installConfig.codename);
      });
      $("#device-config").click(() => {
        shell.openExternal("https://github.com/ubports/installer-configs/blob/master/v1/" + installConfig.codename + ".json");
      }); -->

