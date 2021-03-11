import { writable } from "svelte/store";

//working view
export const animationType = writable("");

//wait for device view
export const deviceSelectOptions = writable([]);

//select os view
export const osSelectOptions = writable([]);
export const installConfigData = writable({});

//user action view
export const actionData = writable({});
export const userActionEventObject = writable({});

//not supported view
export const deviceName = writable("");

//app footer
export const footerData = writable({
  topText: "",
  underText: "",
  speedText: ""
});

//manual download view
export const manualDownloadFileData = writable({});
export const manualDownloadGroup = writable("");
export const eventObject = writable({});

//modals
export const showSelectDeviceModal = writable(false);
export const showDeveloperModeModal = writable(false);

//options modal
export const osInstructsData = writable({});
