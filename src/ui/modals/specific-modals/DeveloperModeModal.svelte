<script>
  import { Accordion, AccordionItem } from "sveltestrap";
  import { createEventDispatcher } from "svelte";
  import Modal from "./Modal.svelte";

  const dispatch = createEventDispatcher();
  const close = () => dispatch("close");
</script>

<Modal on:close={close}>
  <h4 slot="header">How to enable developer mode</h4>
  <div slot="content" style="overflow-y: auto">
    <p>
      Please select the operating system that is currently installed on your
      device to learn how to enable developer mode.
    </p>
    <Accordion>
      <AccordionItem header="Ubuntu Touch">
        <div class="row">
          <div class="col-6">
            <p>
              This is done from System Settings.
              <br />
            </p>
            <ol>
              <li>
                Open System Settings, go to About this Phone, and then Developer
                Mode.
              </li>
              <li>
                The adb service will be enabled if 'developer mode' is selected.
                Note that you must have some sort of lock screen security
                enabled (pin or password), and 'Developer mode' will be greyed
                out if that's not the case.
              </li>
              <li>
                The 'Lock Security' menu there can be used to set a pin or
                password.
              </li>
            </ol>
          </div>
          <div class="col-6">
            <img
              src="./screens/ubuntu-dev-mode.gif"
              alt="ubuntu-dev-mode"
              style="width: 100%"
            />
          </div>
        </div>
      </AccordionItem>
      <AccordionItem header="Android">
        <div class="row">
          <div class="col-6">
            <p>
              This is done from System Settings.
              <br />
            </p>
            <ol>
              <li>
                Go to the settings menu, scroll down and select "About phone".
              </li>
              <li>
                Scroll down to the bottom again, where you see "Build number."
              </li>
              <li>
                Tap it seven (7) times. After the third tap, you'll see a dialog
                that says you're four taps away from being a developer. Keep on
                tapping until you see a dialog saying "You're now a developer"
              </li>
              <li>
                Now go back to the Settings menu and find "developer settings"
                (sometimes called "developer options"), Tap that.
              </li>
              <li>
                Enable "USB debugging", "ADB" or "Android Debug Bridge" option.
                If you see it, also enable the "allow OEM unlock" option, but
                that is not available on every device.
              </li>
            </ol>
          </div>
          <div class="col-6">
            <img
              src="./screens/android-dev-mode.gif"
              alt="android-dev-mode"
              style="width: 100%"
            />
          </div>
        </div>
      </AccordionItem>
    </Accordion>
  </div>
</Modal>
