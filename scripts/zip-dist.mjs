// Zips the packaged Control Central app folder into a single file ready to
// email / upload / hand to a client. Uses PowerShell's built-in Compress-Archive
// on Windows so there's no extra dependency.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { access, rm, stat } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const appDir = join(root, "dist-electron", "Control Central-win32-x64");
const zipPath = join(root, "dist-electron", "Control-Central-windows-x64.zip");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function main() {
  if (!(await exists(appDir))) {
    throw new Error(
      `Packaged app not found at ${appDir}. Run \`npm run dist\` first.`,
    );
  }

  if (await exists(zipPath)) {
    await rm(zipPath);
  }

  console.log(`Zipping ${appDir}`);
  console.log(`     -> ${zipPath}`);
  console.log("This takes a minute or two for a ~300 MB Electron build...");

  // PowerShell is available on all modern Windows installs.
  // -Force overwrites; CompressionLevel Optimal gives the best size.
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `Compress-Archive -Path '${appDir}' -DestinationPath '${zipPath}' -CompressionLevel Optimal -Force`,
  ];
  const result = spawnSync("powershell.exe", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`Compress-Archive failed with exit code ${result.status}`);
  }

  const { size } = await stat(zipPath);
  console.log(`\nCreated: ${zipPath}`);
  console.log(`Size:    ${formatBytes(size)}`);
  console.log("\nYou can send this single .zip file to your client.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
