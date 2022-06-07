<script>
  import SvelteMarkdown from "svelte-markdown";
  const { ipcRenderer } = require("electron");
  import { writable } from "svelte/store";
  import Modal from "./Modal.svelte";

  let prompts = writable([]);
  let formData = {};
  let extraData = {};

  ipcRenderer.on("user:prompt", (e, prompt) => {
    prompt.fields = prompt.fields || [];
    formData[prompt.id] = prompt.fields.reduce(
      (prev, curr) => ({
        [curr.var]: curr.values ? curr.values[0].value : curr.value,
        ...prev
      }),
      {}
    );
    extraData[prompt.id] = prompt.extraData;
    prompts.set([...$prompts, prompt]);
  });

  function close(id) {
    prompts.set($prompts.filter(p => p.id != id));
    delete formData[id];
    delete extraData[id];
  }
  function handleSend(id) {
    ipcRenderer.send(`user:prompt:reply:${id}`, {
      ...formData[id],
      ...extraData[id]
    });
    close(id);
  }
</script>

{#each $prompts as { id, title, description, link, fields, confirm, dismissable }}
  <Modal
    on:close={() => close(id)}
    showCloseButton={dismissable || false}
    isOpen
  >
    <h4 slot="header">{title}</h4>
    <div slot="content">
      <SvelteMarkdown source={description} />
      {#if link}<a href={link}>More Information...</a>{/if}
      {#each fields as field}
        <div class="row">
          <label for="" class="col-3 col-form-label"
            >{field.name || field.title}</label
          >
          <div class="col-9 d-flex align-items-center">
            {#if field.type === "select"}
              <select class="form-select" bind:value={formData[id][field.var]}>
                {#each field.values as value}
                  <option disabled={value.disabled} value={value.value}
                    >{value.label}</option
                  >
                {/each}
              </select>
            {:else if field.type === "checkbox"}
              <input
                class="form-check-input"
                type="checkbox"
                bind:checked={formData[id][field.var]}
              />
            {:else if field.type === "text"}
              <input
                class="form-input"
                type="text"
                placeholder={field.placeholder}
                bind:value={formData[id][field.var]}
              />
            {:else if field.type === "password"}
              <input
                class="form-input"
                type="password"
                placeholder={field.placeholder}
                bind:value={formData[id][field.var]}
              />
            {:else}
              <SvelteMarkdown source={field.description} />
            {/if}
          </div>
        </div>

        {#if field.tooltip || field.link}
          <dl class="row">
            <dt class="col-3" />
            <dd class="col-9">
              {field.tooltip || ""}
              {#if field.link}
                <a href={field.link}>More...</a>
              {/if}
            </dd>
          </dl>
        {/if}
      {/each}
    </div>
    <div slot="actions">
      <button class="btn btn-primary" on:click={() => handleSend(id)}>
        {confirm || "OK"}
      </button>
    </div>
  </Modal>
{/each}
