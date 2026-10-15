const { app, BrowserWindow } = require("electron");
const path = require("path");
let win;
function create() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1000, minHeight: 620,
    backgroundColor: "#1e1e1e", title: "PremiereCut", autoHideMenuBar: true,
    show: !process.argv.includes("--smoke"),
    webPreferences: { nodeIntegration: false, contextIsolation: true, webSecurity: true, backgroundThrottling: false }
  });
  const hash = process.argv.includes("--selftest") ? "selftest" : undefined;
  win.loadFile(path.join(__dirname, "index.html"), { hash });
  win.webContents.on("did-finish-load", async () => {
    if (process.argv.includes("--smoke")) {
      try { const t = await win.webContents.executeJavaScript("document.title"); console.log("ELECTRON_SMOKE|" + t); }
      catch (e) { console.log("ELECTRON_SMOKE|ERR:" + e.message); }
      app.quit();
    }
  });
  win.webContents.on("render-process-gone", (e, d) => { console.log("RENDER_GONE|" + JSON.stringify(d)); });
}
app.whenReady().then(() => {
  create();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) create(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
