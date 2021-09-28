<script>
  import Animation from "../partials/Animation.svelte";
</script>

<Animation />

<div class="loader-circle" />
<div class="loader-line-mask">
  <div class="loader-line" />
</div>

<style>
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
</style>
