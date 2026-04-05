// Copies static assets into the Next standalone output so the server can serve them
// when launched outside the repo root (e.g. from Electron resources).
import { cp, access, readdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const standaloneDir = join(root, ".next", "standalone");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(standaloneDir))) {
    throw new Error(
      `Standalone output not found at ${standaloneDir}. Did you run \`next build\` with output: "standalone"?`,
    );
  }

  const staticSrc = join(root, ".next", "static");
  const staticDest = join(standaloneDir, ".next", "static");
  if (await exists(staticSrc)) {
    await cp(staticSrc, staticDest, { recursive: true });
    console.log(`Copied ${staticSrc} -> ${staticDest}`);
  }

  const publicSrc = join(root, "public");
  const publicDest = join(standaloneDir, "public");
  if (await exists(publicSrc)) {
    await cp(publicSrc, publicDest, { recursive: true });
    console.log(`Copied ${publicSrc} -> ${publicDest}`);
  }

  // Scrub any stray top-level files that Next's file tracer may have pulled
  // into the standalone output from the repo root (e.g. CLAUDE.md, AGENTS.md,
  // README.md, tsconfig.json, next.config.ts, eslint.config.mjs, components.json).
  // We want the shipped app to contain ONLY the runtime files it needs.
  const KEEP = new Set([
    "server.js",
    "package.json",
    "node_modules",
    ".next",
    "public",
    "src", // next standalone may keep traced source files here
  ]);
  const entries = await readdir(standaloneDir, { withFileTypes: true });
  for (const entry of entries) {
    if (KEEP.has(entry.name)) continue;
    const target = join(standaloneDir, entry.name);
    await rm(target, { recursive: true, force: true });
    console.log(`Scrubbed stray file from standalone: ${entry.name}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
