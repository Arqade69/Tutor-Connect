// Runs automatically before `npm run dev` (npm "predev" hook).
// Frees port 1511 so a stale dev server never blocks a fresh start.
import { execSync } from "node:child_process";

const PORT = 1511;

try {
  if (process.platform === "win32") {
    // Kill any process listening on the port (silent if nothing is there).
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`,
      { stdio: "ignore" },
    );
  } else {
    try {
      const pids = execSync(`lsof -ti:${PORT}`, { encoding: "utf8" }).trim();
      if (pids) {
        const cleanPids = pids.split(/\s+/).join(" ");
        execSync(`kill -9 ${cleanPids}`, { stdio: "ignore" });
      }
    } catch {
      // Nothing listening
    }
  }
} catch {
  // Nothing on the port — nothing to do.
}

console.log(`\n  ✔ Ensured port ${PORT} is free.\n`);
