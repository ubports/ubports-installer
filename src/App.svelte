<script>
	const { remote, ipcRenderer, shell } = require("electron");
	import { animationType } from './stores.mjs';

	global.installProperties = remote.getGlobal("installProperties");
	global.packageInfo = remote.getGlobal("packageInfo");

	//Modals
	import NewUpdateModal from './ui/modals/NewUpdateModal.svelte'
	import UdevModal from './ui/modals/UdevModal.svelte'
	import ConnectionLostModal from './ui/modals/ConnectionLostModal.svelte'

	let showNewUpdateModal = false;
	let showUdevModal = false;
	let showConnectionLostModal = false;

	console.log(process.platform, process.env)
	if (process.platform === "linux" && !process.env.SNAP) {
		ipcRenderer.invoke("getSettingsValue", "never.udev")
			.then(never => {
				if (never) {
					setTimeout(() => showUdevModal = true, 1000)
			}
		})
	}

	ipcRenderer.on("user:connection-lost", () => {
		showConnectionLostModal = true;
  });

	//Routing
	import Router from 'svelte-spa-router'
	import { push } from 'svelte-spa-router'

	//Views
	import Done from './ui/views/Done.svelte'
	import NotSupported from './ui/views/NotSupported.svelte'
	import SelectOs from './ui/views/SelectOs.svelte'
	import UserAction from './ui/views/UserAction.svelte'
	import WaitForDevice from './ui/views/WaitForDevice.svelte'
	import Working from './ui/views/Working.svelte'

	const routes = {
		'/': WaitForDevice,

		'/done': Done,

		'/not-supported': NotSupported,

		'/select-os': SelectOs,

		'/user-action': UserAction,

		'/working': Working
	}

	//Messages	
	ipcRenderer.on("user:write:working", (e, animation) => {
		animationType.set(animation);
		push('/working')
	});

	ipcRenderer.on("user:write:done", () => {
		push('/done')
		//$("#progress").width("0%");
	});
	  
	ipcRenderer.on("user:update-available", () => {
      showNewUpdateModal = true;
	});
	
	ipcRenderer.on("user:device-unsupported", (event, device) => {
    //   footer.topText.set("Device not supported");
    //   footer.underText.set("The device " + device + " is not supported");
    //   $("[id=your-device]").text(device);
		push('/not-supported');
	});
	
	ipcRenderer.on("user:action", (event, action) => {
		push('/user-action');
	});

	ipcRenderer.on("user:os", (event, installConfig, osSelects) => {
		global.installConfig = installConfig;
      	global.installConfig.os_to_install = undefined;

		push('/select-os');
	});
</script>

<div class="app-wrapper">
	<div class="header">
		<h3 id="header-text" class="text-muted installer">
			UBports Installer {global.packageInfo.version}
		</h3> 
		<div class="header-buttons-wrapper">
			<button id="help" class="help-button btn btn-primary" on:click={null}>Report a bug</button>
			<button id="donate" class="donate-button btn btn-primary" on:click|preventDefault={() => shell.openExternal("https://ubports.com/donate")}>Donate</button>
		</div>
	</div>
	<div class="view-container container">
		<Router {routes}/>
		{#if showNewUpdateModal}
		<NewUpdateModal on:close={() => showNewUpdateModal = false}/>
		{/if}
		{#if showUdevModal}
		<UdevModal on:close={() => showUdevModal = false}/>
		{/if}
		{#if showConnectionLostModal}
		<ConnectionLostModal on:close={() => showConnectionLostModal = false}/>
		{/if}
	</div>
	<footer class="footer">
		<div class="container">
			<h3 class="text-muted footer-top">
				<span id="footer-top">
					UBports Installer is starting up
				</span>
				<span id="wait-dot"></span>
			</h3>
			<p>
				<span id="footer-bottom" class="text-muted">
					Starting adb service
				</span>
				<span id="footer-speed" class="text-muted"></span>
			</p>
		</div>
	</footer>
</div>

<style>
	.app-wrapper {
		height: 100%;
		display: flex;
		flex-direction: column;
	}

	.header {
		display: flex;
		flex: 1 1 auto;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		max-height: 60px;
		padding: 0 10px 0 10px;
		background-color: #f5f5f5;
	}

	.header-buttons-wrapper button:first-of-type {
		margin-right: 10px;
	}

	.view-container {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
	}

	.footer {
		display: flex;
		flex: 1 1 auto;
		flex-direction: row;
		max-height: 90px;
		background-color: #f5f5f5;
		margin: 0;
	}
</style>