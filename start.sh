#!/bin/bash
# starts a dev instance of the installer and passes on flags
ROLLUP_WATCH=true UBPORTS_INSTALLER_FLAGS="$@" npx rollup -c -w
