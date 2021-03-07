<script>
    import { userActionEventObject, actionData } from '../../stores.mjs';
    let userAction_Title;
    let userAction_Description = false;
    let event;
    let userAction_Button;
    let userAction_Image;

    const unsubscribeActionData = actionData.subscribe(value => {
        userAction_Title = value.title;
        userAction_Description = value.description;
        userAction_Button = value.button;
        userAction_Image = value.image;
    })

    const unsubscribeUserActionEventObject = userActionEventObject.subscribe(value => {
        event = value;
    })
</script>

<div class="row">
    <div class="col-6">
        <img src={userAction_Image?`./img/${userAction_Image}.jpg`:"./screens/Screen6.jpg"} alt="Screen6" style='height: 350px; margin: auto; display: block;'>
    </div>
    <div class="col-6">
        <h4 style='font-weight: bold;'>
            {userAction_Title}
        </h4>
        <p>
            {userAction_Description}
        </p>
        {#if userAction_Button}
        <button class="btn btn-primary" style='width: 100%;' on:click|preventDefault={() => event.sender.send("action:completed")}>
            Continue
        </button>
        {/if}
    </div>
</div>