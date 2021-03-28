<script>
  import { animationType } from "../../stores.mjs";
</script>

<svelte:head>
  <script src="./scripts/particleground.js"></script>
</svelte:head>

<div class="content">
  {#if $animationType === "particles"}
    <div id="particles-background" />
    <div id="particles-foreground" />
  {/if}
  {#if $animationType === "download"}
    <div class="download-animation" />
  {/if}
  {#if $animationType === "push"}
    <div class="push-animation" />
  {/if}
  <div class="loader-circle" />
  <div class="loader-line-mask">
    <div class="loader-line" />
  </div>
</div>

<style>
  .content {
    display: flex;
    flex: 1 1 auto;
    height: 100%;
    justify-content: center;
    align-items: center;
  }

  #particles-background,
  #particles-foreground {
    position: absolute;
    width: 200%;
    height: 200%;
    transform: scale3d(0.5, 0.5, 1);
    z-index: -1;
  }

  .download-animation,
  .push-animation {
    background-repeat: repeat;
    display: block;
    position: absolute;
    top: 60px;
    right: 0;
    bottom: 94px;
    left: 0;
  }

  .download-animation {
    background-image: url("../img/arrow-down.png");
    animation: download-animation 8s linear infinite;
  }

  .push-animation {
    background-image: url("../img/arrow-right.png");
    animation: push-animation 10s linear infinite;
  }

  .loader-circle {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
    background-color: white;
    margin-left: -100px;
    margin-top: -100px;
  }

  .loader-line-mask {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 100px;
    height: 200px;
    margin-left: -100px;
    margin-top: -100px;
    overflow: hidden;
    transform-origin: 100px 100px;
    mask-image: linear-gradient(top, #000000, rgba(0, 0, 0, 0));
    animation: rotate 1.2s infinite linear;
  }

  .loader-line-mask .loader-line {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
  }

  @keyframes rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
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
