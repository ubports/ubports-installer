<script>
  const { shell } = require("electron");

  import {
    manualDownloadFileData,
    manualDownloadGroup,
    eventObject
  } from "../../stores.mjs";

  let downloadedFile;

  function handleManualDownloadButton() {
    $eventObject.sender.send("manual_download:completed", downloadedFile.path);
  }
</script>

<div class="row">
  <div class="col-6">
    <img
      src="./screens/Screen6.jpg"
      alt="Screen6"
      style="height: 350px; margin: auto; display: block;"
    />
  </div>
  <div class="col-6">
    <h4 style="font-weight: bold;">Manual Download</h4>
    <p>
      The <b>{$manualDownloadGroup}</b> file
      <b>{$manualDownloadFileData.name}</b> needs to be manually downloaded due to
      licensing restrictions. Sorry for the inconvenience!
    </p>
    <p>
      Please download the file <b>{$manualDownloadFileData.name}</b> from
      <b
        on:click|preventDefault={() =>
          shell.openExternal($manualDownloadFileData.url)}
        >{$manualDownloadFileData.url}</b
      >.
    </p>
    <p>
      Once you have it, select it in the file picker and click the button below
      to continue.
    </p>
    <div class="input-group" style="margin-bottom: 1em;">
      <div class="custom-file">
        <input type="file" bind:value={downloadedFile} />
      </div>
    </div>
    <button
      id="manual-download-button"
      class="btn btn-primary"
      on:click={() => handleManualDownloadButton}>Continue</button
    >
  </div>
</div>
