/* PremiereCut — menu bar & save/load */
(function () {
  "use strict";

  const Menu = {};
  const dropdown = () => document.getElementById("menuDropdown");
  let openFor = null;

  function item(label, sc, fn) { return { label, sc, fn }; }
  function div() { return { div: true }; }

  const DEFINITIONS = {
    file: [
      item("Proyek Baru", "Ctrl+N", () => App.__newProject()),
      item("Import Media…", "Ctrl+I", () => document.getElementById("fileInput").click()),
      item("Import Subtitle (SRT/VTT)…", "", () => Subtitle.importFile()),
      item("Export Frame (PNG)", "", () => Renderer.exportFrame()),
      div(),
      item("Simpan Proyek", "Ctrl+S", () => Menu.save()),
      item("Muat Proyek…", "Ctrl+O", () => Menu.load()),
      div(),
      item("Simpan ke Browser", "Ctrl+Shift+S", () => IDB.save()),
      item("Buka dari Browser", "Ctrl+Shift+O", () => IDB.load()),
      div(),
      item("Live Caption (Mikrofon)…", "", () => Speech.open()),
      item("Export Video…", "Ctrl+E", () => Exporter.open()),
    ],
    edit: [
      item("Undo", "Ctrl+Z", () => App.undo()),
      item("Redo", "Ctrl+Y", () => App.redo()),
      div(),
      item("Split di Playhead", "S", () => Timeline.splitAtPlayhead()),
      item("Hapus Klip", "Del", () => Timeline.deleteSelection()),
      item("Duplikat Klip", "Ctrl+D", () => Menu.duplicate()),
    ],
    clip: [
      item("Kecepatan 1x", "", () => Menu.setSpeed(1)),
      item("Kecepatan 0.5x", "", () => Menu.setSpeed(0.5)),
      item("Kecepatan 2x", "", () => Menu.setSpeed(2)),
      div(),
      item("Tambah Teks", "T", () => switchTab("text")),
    ],
    sequence: [
      item("Tambah Track Video", "", () => Timeline.addTrack("video")),
      item("Tambah Track Audio", "", () => Timeline.addTrack("audio")),
      div(),
      item("Zoom In Timeline", "", () => Timeline.zoomBy(1.25)),
      item("Zoom Out Timeline", "", () => Timeline.zoomBy(0.8)),
    ],
    effects: [
      item("Panel Filters", "", () => switchTab("filter")),
      item("Panel Effects", "", () => switchTab("effect")),
      item("Panel Transitions", "", () => switchTab("transition")),
      item("Panel Templates", "", () => switchTab("template")),
      item("Panel Teks", "", () => switchTab("text")),
    ],
    color: [item("Buka Lumetri Color", "", () => document.getElementById("colorPanel").scrollIntoView())],
    export: [item("Export Video…", "Ctrl+E", () => Exporter.open()), item("Simpan Proyek (.json)", "Ctrl+S", () => Menu.save())],
    help: [
      item("Cari Fitur…", "Ctrl+K", () => Commands.show()),
      item("Pengaturan…", "Ctrl+,", () => Settings.open()),
      div(),
      item("Shortcut Keyboard", "", () => Menu.shortcuts()),
      item("Tentang PremiereCut", "", () => alert("PremiereCut — gabungan UX Adobe Premiere Pro + panel efek gaya CapCut.\nDibuat sebagai web app untuk pengujian.")),
    ],
  };

  function switchTab(tab) {
    EffectsPanel.tab = tab;
    U.$$("#effectTabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    EffectsPanel.render();
  }
  Menu.__switchTab = switchTab;

  Menu.init = function () {
    document.getElementById("mainMenus").addEventListener("click", (e) => {
      const m = e.target.closest(".menu"); if (!m) return;
      if (openFor === m.dataset.menu) { Menu.close(); return; }
      const def = DEFINITIONS[m.dataset.menu] || [];
      const dd = dropdown();
      dd.innerHTML = "";
      def.forEach((it) => {
        if (it.div) { dd.appendChild(U.el("div", "mdiv")); return; }
        const row = U.el("div", "mi");
        row.appendChild(U.el("span", null, it.label));
        if (it.sc) row.appendChild(U.el("span", "sc", it.sc));
        row.addEventListener("click", () => { Menu.close(); it.fn(); });
        dd.appendChild(row);
      });
      const rect = m.getBoundingClientRect();
      dd.style.left = rect.left + "px";
      dd.style.top = (rect.bottom + 2) + "px";
      dd.classList.remove("hidden");
      m.classList.add("open");
      openFor = m.dataset.menu;
    });

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#mainMenus") && !e.target.closest("#menuDropdown")) Menu.close();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") Menu.close(); });
  };

  Menu.close = function () {
    dropdown().classList.add("hidden");
    U.$$(".menu").forEach((m) => m.classList.remove("open"));
    openFor = null;
  };

  Menu.duplicate = function () {
    const clip = App.selectedClip(); if (!clip) return;
    App.pushUndo();
    const track = App.getClipTrack(clip.id);
    const copy = JSON.parse(JSON.stringify(clip));
    copy.id = U.uid("clip");
    copy.start = clip.start + App.clipDuration(clip);
    track.clips.push(copy); track.clips.sort((a, b) => a.start - b.start);
    App.select(copy.id); App.emit("project");
  };
  Menu.setSpeed = function (s) {
    const clip = App.selectedClip(); if (!clip) return;
    App.pushUndo(); clip.speed = s; Inspector.render(); Renderer.drawFrame(App.playhead); App.emit("project");
  };

  Menu.save = function () {
    const data = { app: "PremiereCut", version: 1, savedAt: new Date().toISOString(), project: App.project };
    U.download("premierecut-project.json", JSON.stringify(data, null, 2), "application/json");
    App.status("Proyek disimpan (JSON).");
  };

  Menu.load = function () {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json,application/json";
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const data = JSON.parse(rd.result);
          const proj = data.project || data;
          App.pushUndo();
          App.project = proj;
          App.project.media.forEach((m) => { if (m.url && m.url.startsWith("blob:")) { m.url = ""; m.thumb = ""; } });
          App.mediaEls = {}; App.mediaSources = {}; App.audioCtx = null; App.audioDest = null;
          App.selection = { clipId: null, mediaId: null };
          App.playhead = 0;
          App.emit("project"); App.emit("media"); App.emit("history");
          Renderer.resize(); Renderer.drawFrame(0);
          App.status("Proyek dimuat. Import ulang media dengan nama sama untuk relink.");
        } catch (e) { App.status("Gagal memuat: " + e.message); }
      };
      rd.readAsText(f);
    });
    inp.click();
  };

  Menu.shortcuts = function () {
    alert([
      "Space : Play / Pause",
      "← / → : Frame mundur / maju",
      "S : Split klip di playhead",
      "Delete : Hapus klip terpilih",
      "Ctrl+Z / Ctrl+Y : Undo / Redo",
      "Ctrl+D : Duplikat klip",
      "Ctrl+I : Import media",
      "Ctrl+S : Simpan proyek",
      "Ctrl+E : Export video",
      "Klik 2x media di bin : tambah ke timeline",
    ].join("\n"));
  };

  // fungsi proyek baru
  App.__newProject = function () {
    if (!confirm("Buat proyek baru? Perubahan belum disimpan akan hilang.")) return;
    App.pushUndo();
    App.project = App.newProject();
    App.selection = { clipId: null, mediaId: null };
    App.playhead = 0;
    Object.keys(App.mediaEls).forEach((id) => { const el = App.mediaEls[id]; if (el && el.pause) try { el.pause(); } catch (e) {} });
    App.mediaEls = {}; App.emit("project"); App.emit("media");
    Renderer.resize(); Renderer.drawFrame(0);
    App.status("Proyek baru dibuat.");
  };

  window.Menu = Menu;
})();
