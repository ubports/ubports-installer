<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	const close = () => dispatch('close');
</script>

<div class="svelte-modal-background" on:click={close}></div>

<div class="svelte-modal" role="dialog" aria-modal="true">
	<div class="svelte-modal-header">
		<slot name="header"></slot>
	</div>
	<div class="svelte-modal-content">
		<slot name="content"></slot>
	</div>
	<div class="svelte-modal-actions">
		<button class="btn btn-default" on:click={close}>Close</button>
		<slot name="actions"></slot>
	</div>
</div>

<style>
	.svelte-modal-background {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0,0,0,0.3);
	}

	.svelte-modal {
		position: absolute;
		left: 50%;
		top: 50%;
		width: calc(100vw - 4em);
		max-width: 32em;
		max-height: calc(100vh - 4em);
		overflow: auto;
		transform: translate(-50%,-50%);
		border-radius: 0.2em;
		background: white;
	}

	.svelte-modal > * {
		padding: 1em;
	}

	.svelte-modal-header {
		border-bottom: 1px solid black;
	}

	.svelte-modal-actions {
		border-top: 1px solid black;
		display: flex;
		flex-direction: row;
		justify-content: flex-end;
		align-items: center;
	}
</style>
