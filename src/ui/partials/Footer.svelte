<script>
  import { onMount } from 'svelte';

  const { ipcRenderer } = require("electron");

	import { footerData } from '../../stores.mjs';

	let progressBarWidth = 0;

	let footer_data;

  onMount(() => {
		footerData.set({
			topText: 'UBports Installer is starting up',
			underText: 'Starting adb service'
		});
	});

  ipcRenderer.on("user:write:status", (e, status, waitDots) => {
		//footer.topText.set(status, waitDots);
		$footerData.topText = status;
	});

	ipcRenderer.on("user:write:under", (e, status) => {
		//footer.underText.set(status, true);
		$footerData.underText = status;
	});

	ipcRenderer.on("user:write:speed", (e, speed) => {
		$footerData.speedText = speed;
	});

	const unsubscribeFooterData = footerData.subscribe(value => {
    footer_data = value;
	});

  ipcRenderer.on("user:write:progress", (e, length) => {
		if (length >= 100) {
			length = 100;
		}
		progressBarWidth = length.toString() + '%';
	});

  function resetProgress() {
    progressBarWidth = 0;
  }
</script>

<div class="progress">
  <div class="progress-bar" style="--progressWidth:{progressBarWidth}"></div>
</div>
<footer class="footer">
  <div class="container">
    <h3>
      <span id="footer-top">
        {footer_data.topText}
      </span>
      <span id="wait-dot"></span>
    </h3>
    <p>
      <span id="footer-bottom">
        {footer_data.underText}
      </span>
      <span id="footer-speed">

      </span>
    </p>
  </div>
</footer>

<style>
  	.progress {
		display: flex;
		flex: 1 1 auto;
		flex-direction: row;
		max-height: 4px;
		background-color: #f5f5f5;
		margin: 0;
	}

	.progress-bar {
		width: var(--progressWidth);
		height: 4px;
		background-color: #E95420;
	}

	.footer {
		display: flex;
		flex: 1 1 auto;
		flex-direction: row;
		height: 90px;
		max-height: 90px;
		background-color: #f5f5f5;
		margin: 0;
	}
</style>