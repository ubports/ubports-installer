<script>
  import { createEventDispatcher } from 'svelte';
  const { ipcRenderer } = require("electron");
  import Modal from './Modal.svelte';

  const dispatch = createEventDispatcher();
  
  function handleUnlockModalButton() {
    ipcRenderer.send('user:unlock:ok')
    close();
  }
  
  const close = () => dispatch('close');
</script>

<Modal on:close={close}>
  <h4 slot="header">
    Read before installing!
  </h4>
  <div slot="content">
    <div id="actions">

    </div>
  </div>
  <div slot="actions">
    <button id="btn-unlock-modal" class="btn btn-primary" on:click={() => handleUnlockModalButton}>Ok</button>
  </div>
</Modal>


<!-- 
  script.
    function addAction(action) {
      // can be used in html IDs
      let baseId = action.title.toLowerCase().replace(/\s/g,"-");

      // div to contain entire action row
      let _div = document.createElement("div");
      _div.className = "form-group";

      // label describing the action
      let _label = document.createElement("label");
      _label.className = "col-xs-3 control-label";
      _label.appendChild(document.createTextNode(action.title));
      _div.appendChild(_label);

      // div to contain input/select element
      let _subdiv = document.createElement("div");
      _subdiv.className = "col-xs-9";

      // create the text
      let _p = document.createElement("p");
      _p.appendChild(document.createTextNode(action.description));
      _p.id = "actions-" + baseId;

      // put it all in there
      _subdiv.appendChild(_p);
      _div.appendChild(_subdiv);
      $("#actions").append(_div);

      // help link
      if (action.link) {
        let _tooltipdiv = document.createElement("div");
        _tooltipdiv.className = "col-xs-3";
        _div.appendChild(_tooltipdiv);
        let _tooltip = document.createElement("p");
        _tooltip.className = "col-xs-9";
        let _tooltiplink = document.createElement("a");
        _tooltiplink.id = baseId + "_link"
        _tooltiplink.appendChild(document.createTextNode("More..."));
        _tooltip.appendChild(_tooltiplink);
        _div.appendChild(_tooltip);
        // HACK: link target can not be set before, because the element needs to have already been created
        if (action.link) $("#" + baseId + "_link").click(() => shell.openExternal(action.link));
      }
    }

    ipcRenderer.on("user:eula", (_, eula) => {
      document.getElementById("unlock-modal-title").innerHTML = "End User License Agreement";
      modals.show('unlock');
      document.getElementById("actions").innerHTML = ""; // remove all previously added actions
      console.log("eula", eula);
      addAction(eula);
    });

    ipcRenderer.on("user:unlock", (_, unlock, user_actions) => {
      document.getElementById("unlock-modal-title").innerHTML = "Before we start...";
      modals.show('unlock');
      document.getElementById("actions").innerHTML = ""; // remove all previously added actions
      unlock.forEach(actionId => addAction(user_actions[actionId]));
    });

    ipcRenderer.on("user:prerequisites", (_, prerequisites, user_actions) => {
      document.getElementById("unlock-modal-title").innerHTML = "Before we continue...";
      modals.show('unlock');
      document.getElementById("actions").innerHTML = ""; // remove all previously added actions
      prerequisites.forEach(actionId => addAction(user_actions[actionId]));
    }); -->
