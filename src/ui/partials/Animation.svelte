<script>
  import { animationType, animationVisible } from "../../stores.mjs";
  import CircuitBoard from "./CircuitBoard.svelte";
  import Squares from "./Squares.svelte";
</script>

{#if $animationVisible && $animationType === "circuit"}
  <div class="animation">
    <CircuitBoard />
  </div>
{/if}
{#if $animationVisible && $animationType === "squares"}
  <div class="animation">
    <Squares />
  </div>
{/if}
{#if $animationVisible && $animationType === "download"}
  <div class="download-animation animation" />
{/if}
{#if $animationVisible && $animationType === "push"}
  <div class="push-animation animation" />
{/if}

<style>
  .animation {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    z-index: -1;
    overflow: hidden;
  }

  .download-animation,
  .push-animation {
    background-repeat: repeat;
    opacity: 0.5;
  }

  .download-animation {
    background-image: url("../img/arrow-down.png");
    animation: download-animation 8s linear infinite;
  }

  .push-animation {
    background-image: url("../img/arrow-right.png");
    animation: push-animation 10s linear infinite;
  }

  @keyframes download-animation {
    from {
      background-position: 0 0;
    }
    to {
      background-position: 0 1200px;
    }
  }

  @keyframes push-animation {
    from {
      background-position: 0 0;
    }
    to {
      background-position: 900px 0px;
    }
  }
</style>
