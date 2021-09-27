<script>
  //Electron imports
  const { ipcRenderer, shell } = require("electron");

  ipcRenderer.on("user:report", (_, done) => requestReport(done));

  //Other methods
  function requestReport(done = false) {
    done ? (showDoNotAskAgainButton = true) : (showDoNotAskAgainButton = true);
    showResultModal = true;
  }
</script>

<div class="header">
  <h1 id="header-text" class="text-muted installer">
    UBports Installer ({global.packageInfo.version})
  </h1>
  <div class="header-buttons">
    <button id="help" class="btn btn-primary" on:click={requestReport}
      >Report a bug</button
    >
    <button
      id="donate"
      class="btn btn-primary"
      on:click|preventDefault={() =>
        shell.openExternal("https://ubports.com/donate")}>Donate</button
    >
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
    height: 2rem;
    padding: 1.5rem;
  }

  .header h1 {
    margin-bottom: 0;
    line-height: 1;
  }

  .header-buttons {
    margin-right: 10px;
    display: flex;
  }

  .header-buttons button {
    margin-left: 1.5rem;
  }
</style>
