<script>
  import { createEventDispatcher } from "svelte";
  import {
    Button,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader
  } from "@sveltestrap/sveltestrap";

  export let showCloseButton = true;
  export let isOpen = false;

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<Modal {isOpen}>
  <ModalHeader>
    <slot name="header" />
  </ModalHeader>
  <ModalBody>
    <slot name="content" class="svelte-modal-content" />
  </ModalBody>
  <ModalFooter>
    {#if showCloseButton}
      <button class="btn btn-first btn-outline-dark px-2" on:click={close}>Close</button>
    {/if}
    <slot name="actions" />
  </ModalFooter>
</Modal>
