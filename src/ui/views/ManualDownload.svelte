<script>
  const { shell } = require("electron");
  import { manualDownloadFileData, manualDownloadGroup, eventObject } from '../../stores.mjs';

  let manualDownload_group;
  let manualDownload_filename;
  let manualDownload_link;
  let event;

  const unsubscribeManualDownloadFileData = manualDownloadFileData.subscribe(value => {
    manualDownload_filename = value.name;
    manualDownload_link = value.url;
  });

  const unsubscribeManualDownloadGroup = manualDownloadGroup.subscribe(value => {
    manualDownload_group = value;
  });

  const unsubscribeEventObject = eventObject.subscribe(value => {
    event = value;
  });

  let downloadedFile;

  function handleManualDownloadButton() {
    event.sender.send(
      "manual_download:completed",
      (global.packageInfo.package !== "snap") ?
      downloadedFile.path :
      downloadedFile
    );
  }
</script>

<div class="row">
  <div class="col-xs-6">
    <img src="./screens/Screen6.jpg" alt="Screen6" style='height: 350px; margin: auto; display: block;'>
  </div>
  <div class="col-xs-6">
    <h4 style='font-weight: bold;'>
      Manual Download
    </h4>
    <p>
    The <b>{manualDownload_group}</b> file <b>{manualDownload_filename}</b> needs to be manually downloaded due to licensing restrictions. Sorry for the inconvenience!
    </p>
    <p>
      Please download the file <b>{manualDownload_filename}</b> from <b on:click|preventDefault={() => shell.openExternal(manualDownload_link)}>{manualDownload_link}</b>.
    </p>
    {#if global.packageInfo.package === "snap"}
    <p>
      Once you have it, enter the path and click the button below to continue.
    </p>
    {:else}
    <p>
      Once you have it, select it in the file picker and click the button below to continue.
    </p>
    {/if}
    <div class="input-group" style="margin-bottom: 1em;">
      <div class="custom-file">
        <!-- HACK remove once https://github.com/electron/electron/pull/19159 is released -->
        {#if global.packageInfo.package === "snap"}
        <input type="" placeholder="enter path here" bind:value={downloadedFile}>
        {:else}
        <input type="file" bind:value={downloadedFile}>
        {/if}
      </div>
    </div>
    <button id="manual-download-button" class="btn btn-primary" on:click={() => handleManualDownloadButton}>Continue</button>
  </div>
</div>