/* PremiereCut — Command Palette: pencarian fitur, efek & tindakan (Ctrl+K) */
(function () {
  "use strict";

  const C = { open: false, all: [], shown: [], sel: 0 };
  const $ = (id) => document.getElementById(id);

  function refresh() {
    if (window.Renderer) Renderer.drawFrame(App.playhead);
    if (window.Inspector) Inspector.render();
    if (window.EffectsPanel) EffectsPanel.render();
    if (window.Timeline) Timeline.render();
  }
  function needClip(msg) {
    const c = App.selectedClip();
    if (!c) { App.status(msg || "Pilih klip dulu di timeline."); return null; }
    return c;
  }
  function visualClip() {
    const c = needClip("Pilih klip visual dulu.");
    if (!c) return null;
    const m = App.getMedia(c.mediaId);
    if (m && m.type === "audio") { App.status("Efek hanya untuk klip visual."); return null; }
    return c;
  }

  function applyFilter(id, name) {
    const c = visualClip(); if (!c) return;
    App.pushUndo();
    const ex = c.filters.find((x) => x.id === id);
    if (ex) ex.intensity = ex.intensity >= 0.99 ? 0 : 1; else c.filters.push({ id: id, intensity: 1 });
    EffectsPanel.tab = "filter";
    refresh(); App.status("Filter: " + name);
  }
  function applyEffect(def) {
    const c = visualClip(); if (!c) return;
    App.pushUndo();
    const ex = c.effects.find((x) => x.id === def.id);
    if (ex) ex.intensity = ex.intensity >= 0.99 ? 0 : 1;
    else c.effects.push({ id: def.id, intensity: 1, params: FXData.effectParams(def) });
    EffectsPanel.tab = "effect";
    refresh(); App.status("Efek: " + def.name);
  }
  function applyTransition(def) {
    const c = visualClip(); if (!c) return;
    App.pushUndo();
    c.transition.in.type = def.id;
    if (def.id !== "none" && !c.transition.in.duration) c.transition.in.duration = 0.5;
    refresh(); App.status("Transisi masuk: " + def.name);
  }

  C.build = function () {
    const list = [];
    const add = (group, title, hint, keywords, run) => list.push({ group, title, hint: hint || "", keywords: keywords || "", run });
    const ctrl = (e) => e.ctrlKey || e.metaKey;

    // File
    add("File", "Proyek Baru", "Ctrl+N", "new project baru", () => App.__newProject());
    add("File", "Import Media", "Ctrl+I", "import media video audio gambar", () => $("fileInput").click());
    add("File", "Import Subtitle (SRT/VTT)", "", "subtitle srt vtt caption import", () => Subtitle.importFile());
    add("File", "Simpan Proyek (.json)", "Ctrl+S", "save simpan json download", () => Menu.save());
    add("File", "Muat Proyek (.json)", "Ctrl+O", "load muat buka json", () => Menu.load());
    add("File", "Simpan ke Browser", "Ctrl+Shift+S", "save browser indexeddb simpan", () => IDB.save());
    add("File", "Buka dari Browser", "Ctrl+Shift+O", "open browser indexeddb muat buka", () => IDB.load());
    add("File", "Export Video", "Ctrl+E", "export video render", () => Exporter.open());
    add("File", "Export Frame (PNG)", "", "export frame png gambar", () => Renderer.exportFrame());

    // Edit
    add("Edit", "Undo", "Ctrl+Z", "undo kembali", () => App.undo());
    add("Edit", "Redo", "Ctrl+Y", "redo maju", () => App.redo());
    add("Edit", "Split di Playhead", "S", "split potong belah", () => Timeline.splitAtPlayhead());
    add("Edit", "Hapus Klip", "Del", "delete hapus buang", () => Timeline.deleteSelection());
    add("Edit", "Duplikat Klip", "Ctrl+D", "duplicate duplikat kopi", () => Menu.duplicate());

    // Sequence
    add("Sequence", "Tambah Track Video", "", "add track video tambah", () => Timeline.addTrack("video"));
    add("Sequence", "Tambah Track Audio", "", "add track audio tambah", () => Timeline.addTrack("audio"));
    add("Sequence", "Zoom In Timeline", "", "zoom in perbesar", () => Timeline.zoomBy(1.25));
    add("Sequence", "Zoom Out Timeline", "", "zoom out perkecil", () => Timeline.zoomBy(0.8));

    // Panel
    add("Panel", "Panel Filters", "", "panel filter buka", () => switchTab("filter"));
    add("Panel", "Panel Effects", "", "panel effect efek buka", () => switchTab("effect"));
    add("Panel", "Panel Transitions", "", "panel transisi buka", () => switchTab("transition"));
    add("Panel", "Panel Templates", "", "panel template buka", () => switchTab("template"));
    add("Panel", "Panel Teks", "", "panel teks text buka", () => switchTab("text"));
    add("Panel", "Pengaturan", "Ctrl+,", "settings pengaturan opsi preferensi", () => Settings.open());
    add("Panel", "Live Caption (Mic)", "", "caption subtitle speech mic auto transkripsi", () => Speech.open ? Speech.open() : openCaption());
    add("Panel", "Shortcut Keyboard", "", "shortcut keyboard bantuan help", () => Menu.shortcuts());

    // Settings toggles
    add("Pengaturan", "Toggle Snapping", "", "snap snapping magnet toggle", () => { App.settings.snap = !App.settings.snap; App.status("Snapping: " + (App.settings.snap ? "ON" : "OFF")); });
    add("Pengaturan", "Ganti Mode Gambar", "", "fit contain cover stretch gambar", () => { const order = ["contain", "cover", "stretch"]; const i = order.indexOf(App.settings.fitMode); App.settings.fitMode = order[(i + 1) % order.length]; Renderer.drawFrame(App.playhead); App.status("Mode gambar: " + App.settings.fitMode); });
    add("Pengaturan", "Warna Latar Hitam", "", "background warna latar black hitam", () => { App.settings.bg = "#000000"; Renderer.drawFrame(App.playhead); });
    add("Pengaturan", "Warna Latar Hijau (Green Screen)", "", "background green hijau chroma", () => { App.settings.bg = "#00b140"; Renderer.drawFrame(App.playhead); });

    // Filters (dinamis)
    FXData.Filters.forEach((f) => add("Filter", f.name, "terapkan ke klip", "filter warna " + (f.tags || ""), () => applyFilter(f.id, f.name)));
    // Effects (dinamis)
    FXData.Effects.forEach((e) => add("Efek", e.name, "terapkan ke klip", "efek " + (e.tags || ""), () => applyEffect(e)));
    // Transitions
    FXData.Transitions.forEach((t) => { if (t.id !== "none") add("Transisi", t.name, "transisi masuk", "transisi " + (t.tags || ""), () => applyTransition(t)); });
    // Templates
    FXData.Templates.forEach((t) => add("Template", t.name, "terapkan template", "template " + (t.tags || ""), () => Presets.applyTemplate(t)));
    // Text presets
    FXData.TextPresets.forEach((tp) => add("Teks", "Tambah teks: " + tp.name, "", "teks text " + (tp.tags || ""), () => { const m = Media.addText(tp.style); m.name = "Teks " + tp.name; Timeline.addMediaToPlayhead(m.id); }));

    C.all = list;
  };

  function switchTab(tab) { Menu.__switchTab ? Menu.__switchTab(tab) : (EffectsPanel.tab = tab, U.$$("#effectTabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab)), EffectsPanel.render()); }
  function openCaption() { const m = $("captionModal"); if (m) m.classList.remove("hidden"); }

  C.init = function () {
    const input = $("paletteInput");
    if (!input) return;
    input.addEventListener("input", () => C.filter(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); C.move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); C.move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); C.run(); }
      else if (e.key === "Escape") { e.preventDefault(); C.close(); }
    });
    $("palette").addEventListener("mousedown", (e) => { if (e.target.id === "palette") C.close(); });
  };

  C.toggle = function () { C.open ? C.close() : C.show(); };
  C.show = function () {
    C.build();
    C.open = true;
    const p = $("palette");
    p.classList.remove("hidden");
    const input = $("paletteInput");
    input.value = ""; input.focus();
    C.filter("");
  };
  C.close = function () { C.open = false; $("palette").classList.add("hidden"); };

  C.filter = function (q) {
    q = (q || "").trim().toLowerCase();
    const words = q ? q.split(/\s+/) : [];
    let out = C.all.filter((it) => {
      const hay = (it.title + " " + it.keywords + " " + it.group).toLowerCase();
      return words.every((w) => hay.indexOf(w) >= 0);
    });
    if (q) {
      out = out.map((it, i) => {
        const t = it.title.toLowerCase();
        let score = t.indexOf(q) === 0 ? 0 : (t.indexOf(q) >= 0 ? 1 : 2);
        if (it.group.toLowerCase().indexOf(q) === 0) score -= 0.5;
        return { it, score, i };
      }).sort((a, b) => a.score - b.score || a.i - b.i).map((x) => x.it);
    }
    C.shown = out.slice(0, 200);
    C.sel = 0;
    C.renderList();
  };

  C.move = function (d) {
    if (!C.shown.length) return;
    C.sel = (C.sel + d + C.shown.length) % C.shown.length;
    C.renderList();
    const el = document.querySelector(".pal-item.sel");
    if (el) el.scrollIntoView({ block: "nearest" });
  };

  C.run = function () {
    const it = C.shown[C.sel];
    if (!it) return;
    C.close();
    try { it.run(); } catch (e) { App.status("Gagal: " + e.message); }
  };

  let lastGroup = null;
  C.renderList = function () {
    const list = $("paletteList");
    list.innerHTML = "";
    lastGroup = null;
    if (!C.shown.length) { list.appendChild(U.el("div", "pal-empty", "Tidak ada hasil untuk pencarian \"" + ($("paletteInput").value) + "\".")); return; }
    C.shown.forEach((it, i) => {
      if (it.group !== lastGroup) { list.appendChild(U.el("div", "pal-group", it.group)); lastGroup = it.group; }
      const row = U.el("div", "pal-item" + (i === C.sel ? " sel" : ""));
      row.appendChild(U.el("span", "pal-title", it.title));
      if (it.hint) row.appendChild(U.el("span", "pal-hint", it.hint));
      row.addEventListener("mousemove", () => { if (C.sel !== i) { C.sel = i; C.renderList(); } });
      row.addEventListener("click", () => { C.sel = i; C.run(); });
      list.appendChild(row);
    });
  };

  window.Commands = C;
})();
