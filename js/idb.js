/* PremiereCut — penyimpanan proyek + media di browser (IndexedDB) */
(function () {
  "use strict";

  const DB = "premierecut";
  const STORE = "store";
  const KEY = "autosave";

  function open() {
    return new Promise((res, rej) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
  }
  async function put(key, val) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error);
    });
  }
  async function get(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function del(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error);
    });
  }

  const IDB = {};

  IDB.supported = function () { return typeof indexedDB !== "undefined"; };

  function serialize() {
    const proj = JSON.parse(JSON.stringify(App.project));
    proj.media.forEach((m) => { m.url = ""; m.thumb = ""; });
    const binaries = [];
    App.project.media.forEach((m) => {
      const blob = App.mediaBlobs[m.id];
      if (blob) binaries.push({ id: m.id, blob: blob });
    });
    return { savedAt: Date.now(), settings: App.settings, project: proj, binaries: binaries };
  }

  IDB.save = async function (silent) {
    if (!IDB.supported()) { if (!silent) App.status("IndexedDB tidak didukung."); return false; }
    try {
      await put(KEY, serialize());
      if (!silent) App.status("Proyek disimpan di browser (" + new Date().toLocaleTimeString() + ").");
      return true;
    } catch (e) { App.status("Gagal simpan browser: " + e.message); return false; }
  };

  IDB.hasAutosave = async function () { try { return !!(await get(KEY)); } catch (e) { return false; } };

  IDB.load = async function () {
    const val = await get(KEY);
    if (!val || !val.project) { App.status("Belum ada proyek tersimpan di browser."); return false; }
    applySnapshot(val);
    App.status("Proyek dimuat dari browser.");
    return true;
  };

  function applySnapshot(val) {
    App.pushUndo();
    if (val.settings) App.settings = Object.assign(App.defaultSettings(), val.settings);
    App.project = val.project;
    App.selection = { clipId: null, mediaId: null };
    App.playhead = 0;
    Object.keys(App.mediaEls).forEach((id) => { const el = App.mediaEls[id]; if (el && el.pause) { try { el.pause(); } catch (e) {} } });
    App.mediaEls = {}; App.mediaBlobs = {};
    (val.binaries || []).forEach((b) => {
      const m = App.getMedia(b.id);
      if (!m || !b.blob) return;
      App.mediaBlobs[b.id] = b.blob;
      m.url = URL.createObjectURL(b.blob);
      if (m.type !== "text") Media.probe(m);
    });
    App.emit("project"); App.emit("media"); App.emit("history");
    if (window.Renderer) { Renderer.resize(); Renderer.drawFrame(0); }
  }

  IDB.clear = async function () { await del(KEY); App.status("Penyimpanan browser dibersihkan."); };

  // ---- autosave ----
  let timer = null;
  IDB.startAutosave = function () {
    stop();
    if (!App.settings.autosave) return;
    timer = setInterval(() => { IDB.save(true); }, Math.max(5000, App.settings.autosaveMs || 20000));
  };
  function stop() { if (timer) clearInterval(timer); timer = null; }
  IDB.restartAutosave = IDB.startAutosave;
  window.addEventListener("beforeunload", () => { if (App.settings.autosave) IDB.save(true); });

  window.IDB = IDB;
})();
