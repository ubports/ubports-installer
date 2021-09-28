<script>
  import { onMount } from "svelte";
  import { animationType } from "../../stores.mjs";
  import { tsParticles } from "tsparticles";

  console.log($animationType);
  onMount(() => {
    if ($animationType === "particles") {
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
        .catch(() => {});
    }
  });
</script>

{#if $animationType === "particles"}
  <div id="tsparticles" class="animation" />
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
  }

  .download-animation,
  .push-animation {
    background-repeat: repeat;
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
