<script>
  const { ipcRenderer } = require("electron");

  import { installConfigData } from "../../stores.mjs";
</script>

<div class="row">
  <div class="col-6">
    <img
      src={`./img/formfactor/${$installConfigData.formfactor}.svg`}
      alt={`${$installConfigData.formfactor}.svg`}
      style="height: 350px; margin: auto; display: block;"
    />
  </div>
  <div class="col-6">
    <h4 style="font-weight: bold;">Success!</h4>
    <p>
      The installation process from the computer is done. The device will now
      perform the remaining steps which should take less than five minutes.
      After the installation, the device will reboot and you can begin to
      explore Ubuntu Touch.
    </p>
    <p>
      Found something you don't like? <a
        href="https://github.com/ubports/ubports-touch">Tell us</a
      >, or help us change it!
    </p>
    <p>
      Development of Ubuntu Touch is driven by the <a href="https://ubports.com"
        >UBports Community</a
      >. <a href="https://ubports.com/donate">Donate</a> now to allow us to
      continue our mission!
      <a
        class="btn btn-default"
        style="width: 49%; margin-bottom: 10px; margin-right: 5px"
        href="https://ubports.com/join-us">Get involved</a
      >
      <a
        class="btn btn-primary"
        style="width: 49%; margin-bottom: 10px;"
        href="https://ubports.com/donate">Donate</a
      >
    </p>
    <p>
      Got more devices you want to flash?
      <button
        class="btn btn-info"
        style="width: 100%;"
        on:click={() => ipcRenderer.send("restart")}
        >Flash another device!</button
      >
    </p>
  </div>
</div>
