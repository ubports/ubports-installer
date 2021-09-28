<script>
  import { onMount } from "svelte";
  import { animationType } from "../../stores.mjs";
  import { tsParticles } from "tsparticles";
  import CircuitBoard from "./CircuitBoard.svelte";

  onMount(updateAnimations);
  animationType.subscribe(updateAnimations);

  function updateAnimations() {
    if (
      $animationType === "particles" &&
      document.getElementById("tsparticles")
    ) {
      document.getElementById("tsparticles").style = "display: inherit";
      tsParticles
        .load("tsparticles", {
          particles: {
            number: { value: 170, density: { enable: !1, value_area: 700 } },
            color: "#6c757d",
            opacity: 0.6,
            size: {
              value: 2.5,
              random: !1,
              anim: { enable: !0, speed: 3, size_min: 1, sync: !1 }
            },
            line_linked: {
              enable: !0,
              distance: 150,
              color: "#6c757d",
              opacity: 0.25,
              width: 1
            },
            move: {
              enable: !0,
              speed: 1,
              direction: "none",
              random: !0,
              straight: !1,
              out_mode: "out",
              bounce: !1,
              attract: { enable: !1, rotateX: 600, rotateY: 1200 }
            }
          },
          fpsLimit: 120
        })
        .catch(error => {
          throw new Error(`Animation error: ${error}`);
        });
    } else if (document.getElementById("tsparticles")) {
      document.getElementById("tsparticles").style = "display: none";
    }
  }
</script>

<!--
  HACK particles can not be conditionally rendered to be reliably shown when transitioning from one working view to the next. We thus hide and show them using css rather than svelte's built-in conditional rendering. Unfortunately, svelte does not yet posess an equivalet to Vue's v-show field.
-->
<div id="tsparticles" class="animation" />
{#if $animationType === "circuit"}
  <div class="animation">
    <CircuitBoard />
  </div>
{/if}
{#if $animationType === "download"}
  <div class="download-animation animation" />
{/if}
{#if $animationType === "push"}
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
