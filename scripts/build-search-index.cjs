const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "scripts/build-search-index.ts"],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
