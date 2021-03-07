<script>
    import { animationType } from '../../stores.mjs';
</script>

<svelte:head>
    <!-- <script src="./scripts/particleground.js"></script> -->
</svelte:head>

<div class="content">
    <!-- <div id="particles-background">
        <div id="particles-foreground"></div>
    </div> -->
    <div class="loader-circle"></div>
    <div class="loader-line-mask">
        <div class="loader-line"></div>
    </div>
</div>
<img src="./img/yumi.svg" alt="yumi" class="ub-robot" width='100'>

<style>
    .content {
        display: flex;
        flex: 1 1 auto;
        height: 100%;
        justify-content: center;
        align-items: center;
    }

    /* #particles-foreground {
        display: flex;
        flex: 1 1 auto;
        height: 100%;
        justify-content: center;
        align-items: center;
    }

    #particles-background {
        display: flex;
        flex: 1 1 auto;
        height: 100%;
        justify-content: center;
        align-items: center;
    }

    #particles-background,
    #particles-foreground {
    -webkit-transform: scale3d(0.5, 0.5, 1);
    -moz-transform: scale3d(0.5, 0.5, 1);
    -ms-transform: scale3d(0.5, 0.5, 1);
    -o-transform: scale3d(0.5, 0.5, 1);
    transform: scale3d(0.5, 0.5, 1);
    z-index: -1;
    } */

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
        -webkit-transform-origin: 100px 100px;
        -moz-transform-origin: 100px 100px;
        -ms-transform-origin: 100px 100px;
        -o-transform-origin: 100px 100px;
        transform-origin: 100px 100px;
        -webkit-mask-image: -webkit-linear-gradient(top, #000000, rgba(0, 0, 0, 0));
        -webkit-animation: rotate 1.2s infinite linear;
        -moz-animation: rotate 1.2s infinite linear;
        -o-animation: rotate 1.2s infinite linear;
        animation: rotate 1.2s infinite linear;
    }

    @-webkit-keyframes rotate{ 0% { -webkit-transform: rotate(0deg);} 100% { -webkit-transform: rotate(360deg);}}
    @-moz-keyframes rotate{ 0% { -moz-transform: rotate(0deg);} 100% { -moz-transform: rotate(360deg);}}
    @-o-keyframes rotate{ 0% { -o-transform: rotate(0deg);} 100% { -o-transform: rotate(360deg);}}
    @keyframes rotate{ 0% {-webkit-transform: rotate(0deg);-moz-transform: rotate(0deg);-ms-transform: rotate(0deg);transform: rotate(0deg);} 100% {-webkit-transform: rotate(360deg);-moz-transform: rotate(360deg);-ms-transform: rotate(360deg);transform: rotate(360deg);}}

    .loader-line-mask .loader-line {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
    }
</style>