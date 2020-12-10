<script>
  import { createEventDispatcher } from 'svelte';
  const { shell, ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();

  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Bootloader locked
  </h4>
  <div slot="content">

  </div>
  <div slot="actions">
    
  </div>
</Modal>

<!-- 
        h4#oem-lock-label.modal-title Bootloader locked
      .modal-body#oem-lock-default
        p Your device's bootloader is locked, that means installation of third party operating systems like Ubuntu Touch is disabled.
        b Removing this lock might void the warranty. If you want to be sure, please ask your manufacturer or vendor if they allow this. UBports is not responsible and won't replace devices in case of warranty loss. You are responsible for your own actions.
        p Do you want to unlock your device now?
        p You might see a confirmation dialog on your device next.
      .modal-body#oem-lock-enable
        p Your device could not be unlocked. Please make sure OEM unlocking is enabled in the devices' #[a(onclick="modals.show('developer-mode-info');") developer options]. After that, you can select the button below to continue the installation.
      .modal-body#oem-lock-code
        p You have to obtain an unlocking code from #[a(onclick="if(lock_code_url) shell.openExternal(lock_code_url)") your vendor]. Please enter the code below and click the button to continue.
        input#oem-lock-code-value(placeholder="unlock code")
      .modal-footer
        button#btn-exit.btn.btn-default(type='button', data-dismiss='modal') Abort
        button#btn-unlock.btn.btn-primary(type='button') Unlock
        i#unlock-prog.fa.fa-cog.fa-spin.fa-2x.fa-fw.hidden(hidden='hidden')
  script.
    let lock_code_url = null;

    ipcRenderer.on("user:oem-lock", (event, enable = false, url) => {
      modals.show('oem-lock');

      if (enable) {
        $("#oem-lock-default").hide();
        $("#oem-lock-enable").show();
      } else {
        $("#oem-lock-default").show();
        $("#oem-lock-enable").hide();
      }

      if(url) {
        $("#oem-lock-code-value")[0].value = ""
        lock_code_url = url;
        shell.openExternal(url);
        $("#oem-lock-code").hide();
        $("#oem-lock-code").show();
      } else {
        $("#oem-lock-code-value")[0].value = ""
        lock_code_url = null;
        $("#oem-lock-code").show();
        $("#oem-lock-code").hide();
      }
    });

    $("#btn-unlock").click(() => {
      ipcRenderer.send(
        "user:oem-lock:ok",
        lock_code_url ? $("#oem-lock-code-value")[0].value : null
      );
      modals.hide('oem-lock');
      $("#btn-unlock").attr("disabled", true);
      $("#btn-exit").attr("disabled", true);
      $("#unlock-prog").removeClass("hidden");
    });

    $("#btn-exit").click(() => {
      var window = remote.getCurrentWindow();
      window.close();
    }); -->
