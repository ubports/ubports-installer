<script>
    import { animationType } from '../../stores.js';
        
    let animation_value;

	const unsubscribe = animationType.subscribe(value => {
		animation_value = value;
	});
</script>

<div class="content">
    <div class="loader-circle"></div>
    <div class="loader-line-mask">
        <div class="loader-line"></div>
    </div>
</div>
<img src="./img/yumi.svg" alt="yumi" class="ub-robot" width='100'>

<style>
    .content {
        display: flex;
        justify-content: center;
        align-items: center;
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
        z-index: 6;
    }
    .loader-line-mask .loader-line {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5);
        z-index: 6;
    }
</style>