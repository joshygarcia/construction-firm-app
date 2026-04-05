import { app, BrowserWindow, dialog, shell } from "electron";
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pipeline } from "node:stream/promises";

type UpdaterConfig = {
  owner: string;
  repo: string;
  assetName: string;
};

type ReleaseInfo = {
  version: string;
  tagName: string;
  zipUrl: string;
  sizeBytes: number;
  notes: string;
  htmlUrl: string;
};

function getUpdaterConfig(): UpdaterConfig | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require(join(app.getAppPath(), "package.json")) as {
      updater?: UpdaterConfig;
    };
    if (!pkg.updater?.owner || !pkg.updater?.repo || !pkg.updater?.assetName) {
      return null;
    }
    if (pkg.updater.owner === "YOUR_GITHUB_USERNAME") {
      return null;
    }
    return pkg.updater;
  } catch {
    return null;
  }
}

/** Compare semver-ish version strings. Returns true if `candidate` > `current`. */
function isNewer(candidate: string, current: string): boolean {
  const norm = (v: string) => v.replace(/^v/, "").split(/[.+-]/).slice(0, 3).map((n) => parseInt(n, 10) || 0);
  const a = norm(candidate);
  const b = norm(current);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) > (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) < (b[i] ?? 0)) return false;
  }
  return false;
}

async function fetchLatestRelease(cfg: UpdaterConfig): Promise<ReleaseInfo | null> {
  const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/releases/latest`;
  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": `${cfg.repo}-updater`,
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    assets: { name: string; browser_download_url: string; size: number }[];
  };
  const asset = data.assets.find((a) => a.name === cfg.assetName);
  if (!asset) return null;
  return {
    version: data.tag_name.replace(/^v/, ""),
    tagName: data.tag_name,
    zipUrl: asset.browser_download_url,
    sizeBytes: asset.size,
    notes: data.body ?? "",
    htmlUrl: data.html_url,
  };
}

async function downloadWithProgress(
  url: string,
  destPath: string,
  onProgress: (received: number, total: number) => void,
): Promise<void> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "control-central-updater" },
  });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }
  const total = Number(res.headers.get("content-length") ?? 0);
  let received = 0;

  mkdirSync(dirname(destPath), { recursive: true });
  const fileStream = createWriteStream(destPath);

  // Node's Web ReadableStream → Node stream transform with progress
  const reader = res.body.getReader();
  const nodeReadable = new (require("node:stream").Readable)({
    async read() {
      try {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
          return;
        }
        received += value.byteLength;
        onProgress(received, total);
        this.push(Buffer.from(value));
      } catch (err) {
        this.destroy(err as Error);
      }
    },
  });

  await pipeline(nodeReadable, fileStream);
}

function writeUpdaterScript(appInstallDir: string, zipPath: string): string {
  const scriptDir = join(tmpdir(), "cc-update");
  mkdirSync(scriptDir, { recursive: true });
  const scriptPath = join(scriptDir, "apply-update.cmd");
  const exeName = "Control Central.exe";

  const script = `@echo off
setlocal
set "APP_DIR=${appInstallDir}"
set "ZIP=${zipPath}"
set "EXE_NAME=${exeName}"

rem Wait up to 30s for the old process to exit
for /l %%i in (1,1,60) do (
  tasklist /fi "imagename eq %EXE_NAME%" | find /i "%EXE_NAME%" >nul || goto :extract
  timeout /t 1 /nobreak >nul
)

:extract
set "STAGE=%TEMP%\\cc-update\\stage"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%STAGE%' -Force"
if errorlevel 1 goto :fail

rem The zip contains a single top-level folder (e.g. "Control Central-win32-x64")
set "SRC="
for /d %%D in ("%STAGE%\\*") do set "SRC=%%D"
if not defined SRC goto :fail

rem Mirror the new build into the install dir. /XD excludes userData just in case
rem it ever lives inside app dir; userData normally lives in %APPDATA%.
robocopy "%SRC%" "%APP_DIR%" /MIR /R:2 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 goto :fail

start "" "%APP_DIR%\\%EXE_NAME%"
rmdir /s /q "%TEMP%\\cc-update" 2>nul
exit /b 0

:fail
echo Update failed. See %TEMP%\\cc-update for details. 1>&2
pause
exit /b 1
`;

  writeFileSync(scriptPath, script, "utf8");
  return scriptPath;
}

function resolveAppInstallDir(): string {
  // In a packager build, app.getPath('exe') is <installDir>\Control Central.exe
  return dirname(app.getPath("exe"));
}

// ---- Progress window ----------------------------------------------------

let progressWin: BrowserWindow | null = null;

function showProgressWindow(version: string): BrowserWindow {
  progressWin = new BrowserWindow({
    width: 480,
    height: 200,
    resizable: false,
    minimizable: false,
    maximizable: false,
    title: `Actualizando a v${version}`,
    backgroundColor: "#0b0b0c",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  progressWin.setMenuBarVisibility(false);

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Actualizando</title>
<style>
  :root { color-scheme: dark; }
  body { font-family: system-ui, sans-serif; background:#0b0b0c; color:#f4f4f5; margin:0; padding:28px; }
  h2 { margin:0 0 6px 0; font-size:16px; font-weight:600; }
  p  { margin:0 0 16px 0; font-size:13px; color:#a1a1aa; }
  .bar { width:100%; height:8px; background:#27272a; border-radius:999px; overflow:hidden; }
  .fill { height:100%; width:0%; background:#10b981; transition: width .15s ease; }
  .row { display:flex; justify-content:space-between; font-size:12px; color:#a1a1aa; margin-top:10px; }
</style></head>
<body>
  <h2>Descargando Control Central v${version}</h2>
  <p>No cierre esta ventana. La aplicación se reiniciará automáticamente cuando termine.</p>
  <div class="bar"><div id="fill" class="fill"></div></div>
  <div class="row"><span id="pct">0%</span><span id="mb">0 / 0 MB</span></div>
  <script>
    // eslint-disable-next-line
    require('electron').ipcRenderer.on('progress', (_e, p) => {
      document.getElementById('fill').style.width = p.pct + '%';
      document.getElementById('pct').textContent = p.pct + '%';
      document.getElementById('mb').textContent = p.mb;
    });
  </script>
</body></html>`;
  // nodeIntegration is false above, so ipcRenderer isn't actually available.
  // We use executeJavaScript instead for progress updates (see updateProgress).
  progressWin.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
  return progressWin;
}

function updateProgress(received: number, total: number) {
  if (!progressWin || progressWin.isDestroyed()) return;
  const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
  const mb = `${(received / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`;
  const js = `
    (function(){
      var f=document.getElementById('fill');
      var p=document.getElementById('pct');
      var m=document.getElementById('mb');
      if(f) f.style.width='${pct}%';
      if(p) p.textContent='${pct}%';
      if(m) m.textContent=${JSON.stringify(mb)};
    })();
  `;
  progressWin.webContents.executeJavaScript(js).catch(() => {});
}

// ---- Public API ---------------------------------------------------------

export async function checkForUpdates(options: { silent: boolean }): Promise<void> {
  if (!app.isPackaged) {
    if (!options.silent) {
      dialog.showMessageBox({
        type: "info",
        title: "Actualizaciones",
        message: "El verificador de actualizaciones solo funciona en la versión empaquetada.",
      });
    }
    return;
  }

  const cfg = getUpdaterConfig();
  if (!cfg) {
    if (!options.silent) {
      dialog.showMessageBox({
        type: "warning",
        title: "Actualizaciones",
        message: "El actualizador no está configurado.",
        detail:
          "Falta el campo \"updater\" en package.json o el repositorio de GitHub no está definido.",
      });
    }
    return;
  }

  let release: ReleaseInfo | null;
  try {
    release = await fetchLatestRelease(cfg);
  } catch (err) {
    if (!options.silent) {
      dialog.showMessageBox({
        type: "error",
        title: "Actualizaciones",
        message: "No se pudo comprobar actualizaciones.",
        detail: String((err as Error).message ?? err),
      });
    }
    return;
  }

  if (!release) {
    if (!options.silent) {
      dialog.showMessageBox({
        type: "info",
        title: "Actualizaciones",
        message: "No se encontró ningún paquete de actualización en la última versión.",
      });
    }
    return;
  }

  const current = app.getVersion();
  if (!isNewer(release.version, current)) {
    if (!options.silent) {
      dialog.showMessageBox({
        type: "info",
        title: "Actualizaciones",
        message: `Ya tiene la última versión (v${current}).`,
      });
    }
    return;
  }

  const { response } = await dialog.showMessageBox({
    type: "question",
    title: "Actualización disponible",
    message: `Versión v${release.version} disponible`,
    detail:
      `Versión actual: v${current}\n\n` +
      `Tamaño de descarga: ${(release.sizeBytes / 1024 / 1024).toFixed(1)} MB\n\n` +
      (release.notes ? `Notas:\n${release.notes.slice(0, 500)}` : "") +
      `\n\nLa aplicación se cerrará e instalará la actualización automáticamente. ` +
      `Sus datos no se verán afectados.`,
    buttons: ["Actualizar ahora", "Más tarde", "Ver en GitHub"],
    defaultId: 0,
    cancelId: 1,
  });

  if (response === 2) {
    shell.openExternal(release.htmlUrl);
    return;
  }
  if (response !== 0) return;

  try {
    showProgressWindow(release.version);
    const zipPath = join(tmpdir(), "cc-update", "Control-Central-windows-x64.zip");
    if (existsSync(zipPath)) rmSync(zipPath, { force: true });
    await downloadWithProgress(release.zipUrl, zipPath, (r, t) => updateProgress(r, t));

    const appDir = resolveAppInstallDir();
    const scriptPath = writeUpdaterScript(appDir, zipPath);

    // Spawn the updater script detached so it survives the quit() below.
    const child = spawn("cmd.exe", ["/c", "start", "", "/min", scriptPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();

    // Give Windows a beat to start the updater before we quit.
    setTimeout(() => app.quit(), 500);
  } catch (err) {
    if (progressWin && !progressWin.isDestroyed()) progressWin.close();
    progressWin = null;
    await dialog.showMessageBox({
      type: "error",
      title: "Actualizaciones",
      message: "La descarga de la actualización falló.",
      detail: String((err as Error).message ?? err),
    });
  }
}
