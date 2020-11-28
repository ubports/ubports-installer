import { writable } from 'svelte/store';

//working view
export const animationType = writable('');

//wait for device view
export const deviceSelectOptions = writable([]);

//select os view
export const osSelectOptions = writable([]);
export const installConfigData = writable({});

//app footer
export const footerData = writable({});
