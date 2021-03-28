<script>
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
  src="./img/yumi.svg"
  alt="yumi"
  class="ubp-robot"
  class:ubp-robot-foot={ubpRobotFoot}
  class:ubp-robot-side={ubpRobotSide}
  width="100"
/>

<style>
  .ubp-robot {
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
    -webkit-transform: translateZ(0) scale(1, 1);
  }

  .ubp-robot-foot {
    bottom: 10px !important;
    position: absolute;
    right: 10px !important;
    width: 50px !important;
    margin-bottom: 0px !important;
    margin-right: 0px !important;
  }

  .ubp-robot-side {
    position: absolute;
    right: 62% !important;
    bottom: 35% !important;
    width: 118px !important;
  }
</style>
