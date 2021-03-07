<script>
    import { userActionEventObject, actionData } from '../../stores.mjs';
</script>

<div class="row">
    <div class="col-6">
        <img src={$actionData.image?`./img/${$actionData.image}.jpg`:"./screens/Screen6.jpg"} alt="Screen6" style='height: 350px; margin: auto; display: block;'>
    </div>
    <div class="col-6">
        <h4 style='font-weight: bold;'>
            {$actionData.title}
        </h4>
        <p>
            {$actionData.description}
        </p>
        {#if $actionData.button}
        <button class="btn btn-primary" style='width: 100%;' on:click|preventDefault={() => $userActionEventObject.sender.send("action:completed")}>
            Continue
        </button>
        {/if}
    </div>
</div>