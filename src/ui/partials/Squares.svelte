<div class="square" />
<div class="square" />
<div class="square" />
<div class="square" />
<div class="square" />
<div class="square" />

<style>
  .square {
    position: absolute;
    top: 80vh;
    left: 45vw;
    width: 10px;
    height: 10px;
    border: solid 1px #6c757d;
    transform-origin: top left;
    transform: scale(0) rotate(0deg) translate(-50%, -50%);
    animation: square 7s ease-in forwards infinite;
  }
  .square:nth-child(2) {
    animation-delay: 1s;
    left: 25vw;
    top: 40vh;
  }
  .square:nth-child(3) {
    animation-delay: 2s;
    left: 75vw;
    top: 50vh;
  }
  .square:nth-child(4) {
    animation-delay: 3s;
    left: 90vw;
    top: 10vh;
  }
  .square:nth-child(5) {
    animation-delay: 4s;
    left: 10vw;
    top: 85vh;
  }
  .square:nth-child(6) {
    animation-delay: 5s;
    left: 50vw;
    top: 10vh;
  }
  @keyframes square {
    from {
      transform: scale(0) rotate(0deg) translate(-50%, -50%);
      opacity: 1;
    }
    to {
      transform: scale(20) rotate(-500deg) translate(-50%, -50%);
      opacity: 0;
    }
  }
</style>
