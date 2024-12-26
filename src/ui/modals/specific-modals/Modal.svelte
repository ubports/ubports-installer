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
      <Button color="primary" on:click={close}>Close</Button>
    {/if}
    <slot name="actions" />
  </ModalFooter>
</Modal>
