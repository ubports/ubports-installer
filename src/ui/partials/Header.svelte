<script>
  import { version } from "../../../package.json";
  import branding from "../../../branding.json";
  const { ipcRenderer } = require("electron");

  function requestReport() {
    ipcRenderer.emit("user:report", false);
  }
</script>

<div class="header">
  <h1 id="header-text" class="text-muted installer">
    {branding["header-text"].replace("{version}", version)}
  </h1>
  <div class="header-buttons">
    {#if branding["donate-url"]}
      <a class="btn btn-primary" href={branding["donate-url"]}>Donate</a>
    {/if}
    {#if branding["allow-reporting"]}
      <button class="btn btn-primary" on:click={requestReport}>
        Report a bug
      </button>
    {/if}
  </div>
</div>

<style>
  .header {
    background-color: #f5f5f5;
    display: flex;
    flex: 1 1 auto;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
  }

  .header h1 {
    margin-bottom: 0;
    line-height: 1;
  }

  .header-buttons {
    display: flex;
  }

  .header-buttons button {
    margin-left: 1.5rem;
  }
</style>
