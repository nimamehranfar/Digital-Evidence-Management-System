/*
  Starts Azurite (local Azure Storage emulator).
  Requires Node.js and either:
    - global azurite installation, OR
    - npx can download it on-demand.

  Ports:
    Blob  : 10000
    Queue : 10001
    Table : 10002
*/

const { spawn } = require("node:child_process");

const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
const args = [
  "-y",
  "azurite",
  "--silent",
  "--location",
  ".azurite",
  "--debug",
  ".azurite/debug.log"
];

const p = spawn(cmd, args, { stdio: "inherit" });

p.on("exit", (code) => process.exit(code ?? 0));
