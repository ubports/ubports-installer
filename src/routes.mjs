import Done from './ui/views/Done.svelte'
import NotSupported from './ui/views/NotSupported.svelte'
import SelectOs from './ui/views/SelectOs.svelte'
import UserAction from './ui/views/UserAction.svelte'
import WaitForDevice from './ui/views/WaitForDevice.svelte'
import Working from './ui/views/Working.svelte'
import ManualDownload from './ui/views/ManualDownload.svelte'

export default {
  '/': WaitForDevice,

  '/done': Done,

  '/not-supported': NotSupported,

  '/select-os': SelectOs,

  '/user-action': UserAction,

  '/working': Working,

  '/manual-download': ManualDownload
}