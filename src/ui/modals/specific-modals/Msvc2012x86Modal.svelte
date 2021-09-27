<script>
  import { createEventDispatcher } from "svelte";
  const { ipcRenderer, shell } = require("electron");
  import Modal from "./Modal.svelte";

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<Modal on:close={close} showCloseButton={false}>
  <h4 slot="header">Missing Dependencies</h4>
  <div slot="content">
    <p>
      Your computer is missing the Visual C++ 2012 32-bit libraries. The
      installer will be unable to detect or flash Samsung devices.
    </p>
    <br />
    <p>
      Please download and install vcredist_x86.exe from <a
        href
        on:click|preventDefault={() =>
          shell.openExternal(
            "https://www.microsoft.com/en-us/download/details.aspx?id=30679"
          )}>Microsoft's download page</a
      >
      and
      <a href on:click|preventDefault={() => ipcRenderer.send("restart")}
        >try again</a
      >.
    </p>
    <br />
    <p>
      If you will not be installing on a Samsung device, you can continue
      without Samsung device support.
    </p>
  </div>
  <div slot="actions">
    <button class="btn btn-default" on:click={() => close()}
      >Continue without Samsung device support</button
    >
    <button class="btn btn-primary" on:click={() => ipcRenderer.send("restart")}
      >Try again</button
    >
  </div>
</Modal>
