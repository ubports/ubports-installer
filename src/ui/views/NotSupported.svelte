<script>
  import { showSelectDeviceModal, deviceName } from "../../stores.mjs";
  import branding from "../../../branding.json";

  let supported = branding["supported-devices"]
    .replace(/(^\w+:|^)\/\//, '')
    .replace(/\/.*$/, '');
</script>

<div class="row">
  <div class="col-6">
    <img
      src="../{branding.screens}/Screen5.jpg"
      alt="Screen5"
      style="height: 350px; margin: auto; display: block;"
    />
  </div>
  <div class="col-6">
    <h4 style="font-weight: bold;">Device not supported</h4>
    <p>
      Your device:
      <span>{$deviceName}</span>
    </p>
    <p>
      <b>Sorry</b>
      , there is no port for this device yet!
    </p>
    <p>
      See
      <a href={branding["supported-devices"]}>{supported}</a>
      for more info
    </p>
    <hr />
    <h4 style="font-weight: bold;">You want to try to install anyway?</h4>
    <p>
      You can try selecting your device manually, but please only do so if
      you're sure that your exact model is actually supported! You might also
      want to <a href={branding["supported-devices"]}>file a bug</a>.
    </p>
    <button
      class="btn btn-default"
      style="width: 100%;"
      on:click={() => showSelectDeviceModal.set(true)}
      >Select device manually</button
    >
  </div>
</div>
