<script>
  import { createEventDispatcher } from "svelte";

  export let showCloseButton = true;

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<div class="svelte-modal-background" />

<div class="svelte-modal" role="dialog" aria-modal="true">
  <div class="svelte-modal-header">
    <slot name="header" />
  </div>
  <div class="svelte-modal-content">
    <slot name="content" />
  </div>
  <div class="svelte-modal-actions">
    {#if showCloseButton}
      <button class="btn btn-default" on:click={close}>Close</button>
    {/if}
    <slot name="actions" />
  </div>
</div>

<style>
  .svelte-modal-background {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  .svelte-modal {
    position: absolute;
    left: 50%;
    top: 50%;
    width: calc(100vw - 4em);
    max-width: 36em;
    max-height: calc(100% - 4em);
    overflow: auto;
    transform: translate(-50%, -50%);
    border-radius: 0.2em;
    background: white;
    z-index: 2;
  }

  .svelte-modal > * {
    padding: 1em;
  }

  .svelte-modal-header {
    border-bottom: 1px solid #e9ecef;
    align-items: center;
  }

  .svelte-modal-content {
    overflow-y: auto;
    max-height: 300px;
  }

  .svelte-modal-actions {
    border-top: 1px solid #e9ecef;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    align-items: center;
  }
</style>
