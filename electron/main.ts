import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "node:path";
import net from "node:net";
import { checkForUpdates } from "./updater";

// Force the app name so `app.getPath('userData')` resolves to
// %APPDATA%\Control Central regardless of the package.json "name" field.
app.setName("Control Central");

const isDev = !app.isPackaged;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      if (address && typeof address === "object") {
        const port = address.port;
        srv.close(() => resolve(port));
      } else {
        srv.close();
        reject(new Error("Failed to obtain free port"));
      }
    });
  });
}

function startNextServer(port: number) {
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.APP_DATA_DIR = app.getPath("userData");
  process.env["NODE_ENV"] = "production";
  // Ship the packaged app with a clean slate (chart of accounts only, no demo data).
  process.env.CONTROL_CENTRAL_BLANK_SEED = "1";

  // In a packaged build, the standalone server is placed under resources/app/.next/standalone
  const serverPath = join(
    process.resourcesPath,
    "app",
    ".next",
    "standalone",
    "server.js",
  );

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(serverPath);
}

async function waitForServer(url: string, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Next server did not start within ${timeoutMs}ms`);
}

async function createWindow() {
  const port = isDev ? 3000 : await findFreePort();
  const url = `http://127.0.0.1:${port}`;

  if (!isDev) {
    startNextServer(port);
    await waitForServer(url);
  } else {
    // Dev: next dev is started externally by `npm run electron:dev`
    await waitForServer(url, 60_000);
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Control Central",
    backgroundColor: "#0b0b0c",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Keep the menu bar hidden but still mounted so Alt shows it and
  // "Ayuda → Buscar actualizaciones…" is reachable.
  const menu = Menu.buildFromTemplate([
    {
      label: "Archivo",
      submenu: [{ role: "quit", label: "Salir" }],
    },
    {
      label: "Ver",
      submenu: [
        { role: "reload", label: "Recargar" },
        { role: "toggleDevTools", label: "Herramientas de desarrollo" },
        { type: "separator" },
        { role: "resetZoom", label: "Tamaño normal" },
        { role: "zoomIn", label: "Acercar" },
        { role: "zoomOut", label: "Alejar" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Pantalla completa" },
      ],
    },
    {
      label: "Ayuda",
      submenu: [
        {
          label: "Buscar actualizaciones…",
          click: () => {
            checkForUpdates({ silent: false }).catch((err) => {
              console.error("Update check failed:", err);
            });
          },
        },
        {
          label: "Acerca de",
          click: () => {
            const { dialog } = require("electron");
            dialog.showMessageBox({
              type: "info",
              title: "Control Central",
              message: "Control Central",
              detail: `Versión v${app.getVersion()}`,
            });
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
  win.setAutoHideMenuBar(true);
  win.setMenuBarVisibility(false);
  win.loadURL(url);

  win.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    shell.openExternal(targetUrl);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow()
    .then(() => {
      // Silent background check on every startup. Waits a few seconds so the
      // main window finishes loading before any update dialog can appear.
      setTimeout(() => {
        checkForUpdates({ silent: true }).catch((err) => {
          console.error("Silent update check failed:", err);
        });
      }, 4000);
    })
    .catch((err) => {
      console.error("Failed to start Control Central:", err);
      app.quit();
    });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(console.error);
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
