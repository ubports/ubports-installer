<script>
  const { ipcRenderer } = require("electron");
  import branding from "../../../branding.json";
</script>

<div class="row">
  <div class="col-6">
    <img
      src="../{branding.screens}/Screen6.jpg"
      alt="Screen6"
      style="height: 350px; margin: auto; display: block;"
    />
  </div>
  <div class="col-6">
    <h4 style="font-weight: bold;">Success!</h4>
    <p>
      The installation process from the computer is done. The device will now
      perform the remaining steps which should take less than five minutes.
      After the installation, the device will reboot and you can begin to
      explore {branding.os}.
    </p>
    {#if branding.feedback}
      <p>
        Found something you don't like? <a
          href={branding.feedback}>Tell us</a
        >, or help us change it!
      </p>
    {/if}
    <p>
      {#if branding.os === "Ubuntu Touch"}
         Development of Ubuntu Touch and this installer is driven by the
         <a href="https://ubports.com">UBports Community</a>.
      {:else}
         Development of this installer is driven by the
         <a href="https://ubports.com">UBports Community</a>.
      {/if}
      {#if branding["donate-url"]}
        <a href={branding["donate-url"]}>Donate</a> now to allow us to
        continue our mission!
      {/if}
      {#if branding.participate}
        <a
          class="btn btn-default"
          style="width: 49%; margin-bottom: 10px; margin-right: 5px"
          href={branding.participate}>Get involved</a
        >
      {/if}
      {#if branding["donate-url"]}
        <a
          class="btn btn-primary"
          style="width: 49%; margin-bottom: 10px;"
          href={branding["donate-url"]}>Donate</a
        >
      {/if}
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
