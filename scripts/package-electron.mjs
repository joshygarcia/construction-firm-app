// Packages the app into dist-electron/Control Central-win32-x64/ using @electron/packager.
// We intentionally skip electron-builder (and its winCodeSign helper, which fails on
// Windows without Developer Mode due to macOS symlinks inside the archive).
import { packager } from "@electron/packager";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rm, access, copyFile } from "node:fs/promises";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "dist-electron");

// Paths we want to KEEP inside the packaged app. Everything else is ignored.
// The path passed to the ignore function is prefixed with "/" and uses POSIX separators.
const keepPrefixes = [
  "/package.json",
  "/electron",
  "/electron/dist",
  "/.next",
  "/.next/standalone",
];

const keepDescendants = [
  "/electron/dist/",
  "/.next/standalone/",
];

function shouldIgnore(pathFromRoot) {
  // Normalize to forward slashes (packager already does this on win32)
  const p = pathFromRoot.split("\\").join("/");

  // Keep the root itself
  if (p === "" || p === "/") return false;

  // Always drop our own build output and VCS / dev artifacts
  if (p === "/dist-electron" || p.startsWith("/dist-electron/")) return true;
  if (p === "/.git" || p.startsWith("/.git/")) return true;
  if (p === "/src" || p.startsWith("/src/")) return true;
  if (p === "/supabase" || p.startsWith("/supabase/")) return true;
  if (p === "/scripts" || p.startsWith("/scripts/")) return true;
  if (p === "/public" || p.startsWith("/public/")) return true;
  if (p === "/.claude" || p.startsWith("/.claude/")) return true;
  if (p === "/.data" || p.startsWith("/.data/")) return true;
  if (p === "/node_modules" || p.startsWith("/node_modules/")) return true;
  if (p === "/coverage" || p.startsWith("/coverage/")) return true;

  // Keep only the .next/standalone subtree (drop the rest of .next)
  if (p === "/.next") return false;
  if (p.startsWith("/.next/")) {
    if (p === "/.next/standalone" || p.startsWith("/.next/standalone/")) return false;
    return true;
  }

  // Keep electron/dist, drop electron/main.ts source and tsconfig
  if (p === "/electron") return false;
  if (p.startsWith("/electron/")) {
    if (p === "/electron/dist" || p.startsWith("/electron/dist/")) return false;
    return true;
  }

  // Keep exactly these top-level files
  if (p === "/package.json") return false;

  // Drop everything else at the project root (next.config.ts, tsconfig*.json, README, tests, etc.)
  return true;
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await rm(out, { recursive: true, force: true });

  const iconPath = join(root, "electron", "icon.ico");
  const hasIcon = await fileExists(iconPath);
  if (hasIcon) {
    console.log(`Using icon: ${iconPath}`);
  } else {
    console.log("No electron/icon.ico found — using default Electron icon.");
  }

  const appPaths = await packager({
    dir: root,
    out,
    name: "Control Central",
    platform: "win32",
    arch: "x64",
    overwrite: true,
    asar: false, // Next standalone server reads files dynamically; don't pack into asar
    prune: false, // We already aggressively ignore files
    ignore: (p) => shouldIgnore(p),
    appVersion: "0.1.0",
    appCopyright: "Control Central",
    icon: hasIcon ? iconPath : undefined,
    win32metadata: {
      ProductName: "Control Central",
      CompanyName: "Control Central",
      FileDescription: "Control Central",
    },
  });

  // Drop a plain-text README next to the .exe so the client has instructions.
  const readmeSrc = join(root, "electron", "client-README.txt");
  if (await fileExists(readmeSrc)) {
    for (const appPath of appPaths) {
      const readmeDest = join(appPath, "LEAME.txt");
      await copyFile(readmeSrc, readmeDest);
      console.log(`Copied client README -> ${readmeDest}`);
    }
  }

  console.log("\nPackaged:");
  for (const p of appPaths) console.log(" -", p);
  console.log(`\nRun the app:  "${appPaths[0]}\\Control Central.exe"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
