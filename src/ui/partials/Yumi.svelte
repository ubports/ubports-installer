<script>
  import branding from "../../../branding.json";

  let ubpRobotFoot = true;
  let ubpRobotSide = false;

  export function setPosition(position) {
    switch (position) {
      case "foot":
        ubpRobotFoot = true;
        ubpRobotSide = false;
        break;

      case "side":
        ubpRobotFoot = false;
        ubpRobotSide = true;
        break;

      case "center":
        ubpRobotFoot = false;
        ubpRobotSide = false;
        break;

      default:
        break;
    }
  }
</script>

<img
  src="../{branding.images}/{branding.logo}"
  alt="yumi"
  class="yumi"
  class:yumi-foot={ubpRobotFoot}
  class:yumi-side={ubpRobotSide}
  width="100"
/>

<style>
  .yumi {
    bottom: 50%;
    right: 50%;
    margin-bottom: -72px;
    margin-right: -50px;
    text-align: center;
    position: absolute;
    z-index: 1;
    -webkit-transition: all 0.7s ease;
    -moz-transition: all 0.7s ease;
    -o-transition: all 0.7s ease;
    transition: all 0.7s ease;
    image-rendering: crisp-edges;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-transform: translateZ(0) scale(1, 1);
    transform: translateZ(0) scale(1, 1);
  }

  .yumi-foot {
    bottom: 10px !important;
    position: absolute;
    right: 1.5rem !important;
    width: 3.2rem !important;
    margin: 0;
  }

  .yumi-side {
    position: absolute;
    right: 62% !important;
    bottom: 35% !important;
    width: 118px !important;
  }
</style>
