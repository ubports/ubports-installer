<script>
	//Svelte imports
	import { onMount } from 'svelte';

	//Electron imports
	const { remote, ipcRenderer, shell } = require("electron");

	//Store imports
	import { 
		animationType, footerData, osSelectOptions, 
		installConfigData, manualDownloadGroup, manualDownloadFileData, 
		eventObject, showSelectDeviceModal, showDeveloperModeModal,
		deviceSelectOptions, userActionEventObject, actionData,
		deviceName, osInstructsData
	} from './stores.mjs';

	//Modals
	import NewUpdateModal from './ui/modals/NewUpdateModal.svelte'
	import UdevModal from './ui/modals/UdevModal.svelte'
	import ConnectionLostModal from './ui/modals/ConnectionLostModal.svelte'
	import NoNetworkModal from './ui/modals/NoNetworkModal.svelte'
	import LowPowerModal from './ui/modals/LowPowerModal.svelte'
	import WindowsDriversModal from './ui/modals/WindowsDriversModal.svelte'
	import SelectDeviceModal from './ui/modals/SelectDeviceModal.svelte'
	import DeveloperModeModal from './ui/modals/DeveloperModeModal.svelte'
	import ErrorModal from './ui/modals/ErrorModal.svelte'
	import ResultModal from './ui/modals/ResultModal.svelte'
	import UnlockModal from './ui/modals/UnlockModal.svelte'
	import OptionsModal from './ui/modals/OptionsModal.svelte'
	import OemLockModal from './ui/modals/OemLockModal.svelte'

	//Routing
	import Router from 'svelte-spa-router'
	import { push } from 'svelte-spa-router'
	import routes from './routes.mjs'

	//Variables
	//Global variables
	global.installProperties = remote.getGlobal("installProperties");
	global.packageInfo = remote.getGlobal("packageInfo");

	//Modal variables
	let showNewUpdateModal = false;
	let showUdevModal = false;
	let showConnectionLostModal = false;
	let showNoNetworkModal = false;
	let showLowPowerModal = false;
	let showWindowsDriversModal = false;
	let show_selectDeviceModal;
	let show_developerModeModal = false;
	let showErrorModal = false;
	let showResultModal = false;
	let showUnlockModal = false;
	let showOptionsModal = false;
	let showOemLockModal = false;
	
	//Modal props
	let select_options;
	let errorData;
	let showDoNotAskAgainButton;
	let unlockData;
	let oemUnlockData;

	//Footer
	let progressBarWidth = 0;
	//Footer data
	let footer_data;

	ipcRenderer.on("user:write:status", (e, status, waitDots) => {
		//footer.topText.set(status, waitDots);
		// footerData.set({
		// 	topText: status,
		// });
		// footerData.topText.set({
		// 	status
		// });
	});

	ipcRenderer.on("user:write:under", (e, status) => {
		//footer.underText.set(status, true);
		// footerData.underText.set({
		// 	status
		// });
	});

	ipcRenderer.on("user:write:speed", (e, speed) => {
		//footer.speedText.set(speed);
	});

	//Reactive variables
	const unsubscribeFooterData = footerData.subscribe(value => {
    footer_data = value;
	});
	
	const unsubscribeShowSelectDeviceModal = showSelectDeviceModal.subscribe(value => {
    show_selectDeviceModal = value;
	});
	
	const unsubscribeShowDeveloperModeModal = showDeveloperModeModal.subscribe(value => {
    show_developerModeModal = value;
	});
	
	const unsubscribeDeviceSelectOptions = deviceSelectOptions.subscribe(value => {
    select_options = value;
  });

	//Life cycle methods
	onMount(() => {
		footerData.set({
			topText: 'UBports Installer is starting up',
			underText: 'Starting adb service'
		});
	});

	//Messages
	//Modal related messages
	if (process.platform === "linux" && !process.env.SNAP) {
		ipcRenderer.invoke("getSettingsValue", "never.udev")
			.then(never => {
				if (never) {
					setTimeout(() => showUdevModal = true, 1000)
			}
		})
	}

	if (process.platform === "win32") {
		ipcRenderer.invoke("getSettingsValue", "never.windowsDrivers")
			.then(never => {
				if (never) {
					setTimeout(() => showWindowsDriversModal = true, 1000)
				}
			})
	}

	ipcRenderer.on("user:connection-lost", () => {
		showConnectionLostModal = true;
	});
	
	ipcRenderer.on("user:no-network", () => {
    showNoNetworkModal = true;
	});
	
	ipcRenderer.on("user:low-power", (callback) => {
    showLowPowerModal = true;
	});

	ipcRenderer.on("user:update-available", () => {
      showNewUpdateModal = true;
	});

	ipcRenderer.on("user:error", (event, error, restart, ignore) => {
		errorData = error;
		showErrorModal = true;
	});

	ipcRenderer.on("user:report", (_, done) => requestReport(done));

	//Routing messages
	ipcRenderer.on("user:write:working", (e, animation) => {
		animationType.set(animation);
		push('/working')
	});

	ipcRenderer.on("user:write:progress", (e, length) => {
		if (length >= 100) {
			length = 100;
		}
		progressBarWidth = length.toString() + '%';
	});

	ipcRenderer.on("user:write:done", () => {
		push('/done')
		progressBarWidth = 0;
	});
	
	ipcRenderer.on("user:device-unsupported", (event, device) => {
		footerData.set({
			topText: "Device not supported",
			underText: `The device ${device} is not supported`
		});
    deviceName.set(device);
		push('/not-supported');
	});
	
	ipcRenderer.on("user:action", (event, action) => {
		userActionEventObject.set(event);
		actionData.set(action);
		push('/user-action');
	});

	ipcRenderer.on("user:os", (event, installConfig, osSelects) => {
		global.installConfig = installConfig;
		global.installConfig.os_to_install = undefined;

		footerData.set({
			topText: `${installConfig.name} (${installConfig.codename})`,
			underText: "Please select an operating system for installation"
		});

		osSelectOptions.set(osSelects);
		installConfigData.set(installConfig)
		
		push('/select-os');
	});

	ipcRenderer.on("user:manual_download", (event, file, group) => {
		manualDownloadGroup.set(group);
		manualDownloadFileData.set(file);
		eventObject.set(event);
		push('/manual-download');
	});

	ipcRenderer.on("user:configure", (event, osInstructs) => {
		osInstructsData.set(osInstructs);
		animationType.set('particles');
		push('/working');
		footerData.set({
			topText: `${installConfig.name} (${installConfig.codename})`,
			underText: "Please Configure the installation"
		});
		showOptionsModal = true;
	});
	
	ipcRenderer.on("user:eula", (_, eula) => {
		unlockData = eula;
		showUnlockModal = true;
		console.log("eula", eula);
	});

	ipcRenderer.on("user:unlock", (_, unlock, user_actions) => {
		unlockData = user_actions
		showUnlockModal = true;
	});

	ipcRenderer.on("user:prerequisites", (_, prerequisites, user_actions) => {
		unlockData = user_actions
		showUnlockModal = true;
	});
	
	ipcRenderer.on("user:oem-lock", (event, enable = false, url) => {
		oemUnlockData = {
			enable: enable,
			url: url,
		};
		showOemLockModal = true;
  });

	//Error handling
	// Catch all unhandled errors in rendering process
	window.onerror = (err, url, line) => {
		ipcRenderer.send("renderer:error", err + " (MainRenderer:" + line + ")");
	}
		
	//Other methods
	function requestReport(done = false) {
		done? showDoNotAskAgainButton = true : showDoNotAskAgainButton = true;
		showResultModal = true;
	}
</script>

<div class="app-wrapper">
	<div class="header">
		<h3 id="header-text" class="text-muted installer">
			UBports Installer {global.packageInfo.version}
		</h3> 
		<div class="header-buttons-wrapper">
			<button id="help" class="help-button btn btn-primary" on:click={requestReport}>Report a bug</button>
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
		{#if showNoNetworkModal}
		<NoNetworkModal on:close={() => showNoNetworkModal = false}/>
		{/if}
		{#if showLowPowerModal}
		<LowPowerModal on:close={() => showLowPowerModal = false}/>
		{/if}
		{#if showWindowsDriversModal}
		<WindowsDriversModal on:close={() => showWindowsDriversModal = false}/>
		{/if}
		{#if show_selectDeviceModal}
		<SelectDeviceModal selectOptions={select_options} on:close={() => showSelectDeviceModal.set(false)}/>
		{/if}
		{#if show_developerModeModal}
		<DeveloperModeModal on:close={() => showDeveloperModeModal.set(false)}/>
		{/if}
		{#if showErrorModal}
		<ErrorModal errorData={errorData} on:close={() => showErrorModal = false}/>
		{/if}
		{#if showResultModal}
		<ResultModal showDoNotAskAgainButton={showDoNotAskAgainButton} on:close={() => showResultModal = false}/>
		{/if}
		{#if showUnlockModal}
		<UnlockModal unlockData={unlockData} on:close={() => showUnlockModal = false}/>
		{/if}
		{#if showOptionsModal}
		<OptionsModal on:close={() => showOptionsModal = false}/>
		{/if}
		{#if showOemLockModal}
		<OemLockModal oemUnlockData={oemUnlockData} on:close={() => showOemLockModal = false}/>
		{/if}
	</div>
	<div class="progress">
		<div class="progress-bar" style="--progressWidth:{progressBarWidth}"></div>
	</div>
	<footer class="footer">
		<div class="container">
			<h3 class="text-muted footer-top">
				<span id="footer-top">
					{footer_data.topText}
				</span>
				<span id="wait-dot"></span>
			</h3>
			<p>
				<span id="footer-bottom" class="text-muted">
					{footer_data.underText}
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
		max-height: 90px;
		background-color: #f5f5f5;
		margin: 0;
	}
</style>