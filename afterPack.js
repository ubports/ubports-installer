const fs = require("fs-extra");
const path = require("path");

module.exports = async function(context) {
  const distDir = context.appOutDir;
  var wrapperScript;

  if (context.targets.find(target => target.name === "deb")) {
    wrapperScript = `#!/bin/bash
      /opt/ubports-installer/ubports-installer.bin --no-sandbox "$@"
    `;
  } else if (context.targets.find(target => target.name === "appImage")) {
    wrapperScript = `#!/bin/bash
      "\${BASH_SOURCE%/*}"/ubports-installer.bin --no-sandbox "$@"
    `;
  } else {
    console.log("no wrapper needed");
    return;
  }

  fs.moveSync(
    path.join(distDir, "ubports-installer"),
    path.join(distDir, "ubports-installer.bin")
  );
  fs.writeFileSync(path.join(distDir, "ubports-installer"), wrapperScript);
  fs.chmodSync(path.join(distDir, "ubports-installer"), 0o765);
};
