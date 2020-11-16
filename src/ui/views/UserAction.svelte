<script>

    let event;
    let userActionTitle;
    let userActionDescription;
    let userActionButton;

</script>

<div class="row">
    <div class="col-xs-6">
        <img src="../screens/Screen6.jpg" alt="Screen6" style='height: 350px; margin: auto; display: block;'>
    </div>
    <div class="col-xs-6">
        <h4 style='font-weight: bold;'>
            {userActionTitle}
        </h4>
        <p>
            {userActionDescription}
        </p>
        {#if userActionButton}
        <button class="btn btn-primary" style='width: 100%;' on:click|preventDefault={() => event.sender.send("action:completed")}>
            Continue
        </button>
        {/if}
    </div>
</div>

    <!-- ipcRenderer.on("user:action", (event, action) => {
      views.show("user-action")
      $("#user-action-title").text(action.title)
      $("#user-action-description").text(action.description)

      if (action.image) $("#user-action-image").attr("src", "../img/" + action.image + ".jpg");
      else $("#user-action-image").attr("src", "../screens/Screen6.jpg");
    }); -->