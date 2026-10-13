/* PremiereCut — panel Effects & Filters (gaya CapCut) */
(function () {
  "use strict";

  const P = { tab: "filter", query: "" };

  P.init = function () {
    document.getElementById("effectTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      P.tab = b.dataset.tab;
      U.$$("#effectTabs button").forEach((x) => x.classList.toggle("active", x === b));
      P.render();
    });
    const si = document.getElementById("effectSearch");
    if (si) {
      si.addEventListener("input", () => { P.query = si.value.trim().toLowerCase(); P.render(); });
    }
    const sc = document.getElementById("effectSearchClear");
    if (sc) sc.addEventListener("click", () => { if (si) si.value = ""; P.query = ""; P.render(); });
    App.on("select", P.render);
    App.on("project", P.render);
    P.render();
  };

  function match(it) {
    if (!P.query) return true;
    const hay = (it.name + " " + (it.tags || "") + " " + (it.group || "")).toLowerCase();
    return P.query.split(/\s+/).every((w) => hay.indexOf(w) >= 0);
  }

  P.render = function () {
    const grid = document.getElementById("effectGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (P.tab === "filter") renderGroups(grid, FXData.Filters.filter(match), "filter");
    else if (P.tab === "effect") renderGroups(grid, FXData.Effects.filter(match), "effect");
    else if (P.tab === "transition") renderTransitions(grid);
    else if (P.tab === "template") renderTemplates(grid);
    else renderText(grid);
  };

  function renderTemplates(grid) {
    const list = FXData.Templates.filter(match);
    grid.appendChild(U.el("div", "fx-cat", "Template (klik untuk terapkan ke klip terpilih)"));
    if (!list.length) { grid.appendChild(U.el("div", "empty", "Tidak ada hasil.")); return; }
    list.forEach((tpl) => {
      const el = U.el("div", "fx-item tpl");
      el.appendChild(FXThumb.el("template", tpl));
      el.appendChild(U.el("div", "fx-name", tpl.name));
      el.addEventListener("click", () => { Presets.applyTemplate(tpl); P.render(); });
      grid.appendChild(el);
    });
  }

  function clipAccepts() {
    const clip = App.selectedClip();
    if (!clip) { App.status("Pilih klip dulu di timeline."); return null; }
    const media = App.getMedia(clip.mediaId);
    if (media && media.type === "audio") { App.status("Efek hanya untuk klip visual."); return null; }
    return clip;
  }

  function renderGroups(grid, list, kind) {
    const clip = App.selectedClip();
    if (!list.length) { grid.appendChild(U.el("div", "empty", "Tidak ada hasil.")); return; }
    const groups = {};
    list.forEach((it) => { (groups[it.group] = groups[it.group] || []).push(it); });
    Object.keys(groups).forEach((g) => {
      grid.appendChild(U.el("div", "fx-cat", g));
      groups[g].forEach((it) => grid.appendChild(fxItem(it, kind, clip)));
    });
  }

  function fxItem(it, kind, clip) {
    const applied = clip && ((kind === "filter" && clip.filters.some((f) => f.id === it.id)) ||
      (kind === "effect" && clip.effects.some((e) => e.id === it.id)));
    const el = U.el("div", "fx-item" + (applied ? " sel" : ""));
    el.appendChild(FXThumb.el(kind, it));
    el.appendChild(U.el("div", "fx-name", it.name));
    el.addEventListener("click", () => {
      const c = clipAccepts();
      if (!c) return;
      App.pushUndo();
      const arr = kind === "filter" ? c.filters : c.effects;
      const existing = arr.find((x) => x.id === it.id);
      if (existing) existing.intensity = existing.intensity >= 0.99 ? 0 : 1;
      else arr.push({ id: it.id, intensity: 1 });
      Renderer.drawFrame(App.playhead);
      Inspector.render();
      P.render();
      App.status(it.name + " diterapkan");
    });
    return el;
  }

  function renderTransitions(grid) {
    const list = FXData.Transitions.filter(match);
    grid.appendChild(U.el("div", "fx-cat", "Transisi (diterapkan ke klip terpilih)"));
    if (!list.length) { grid.appendChild(U.el("div", "empty", "Tidak ada hasil.")); return; }
    list.forEach((tr) => {
      const el = U.el("div", "fx-item tr");
      el.appendChild(FXThumb.el("transition", tr));
      el.appendChild(U.el("div", "fx-name", tr.name));
      el.addEventListener("click", () => {
        const c = clipAccepts();
        if (!c) return;
        App.pushUndo();
        c.transition.in.type = tr.id;
        if (tr.id !== "none" && c.transition.in.duration === 0) c.transition.in.duration = 0.5;
        Renderer.drawFrame(App.playhead);
        Inspector.render();
        App.status("Transisi masuk: " + tr.name);
      });
      grid.appendChild(el);
    });
  }

  function renderText(grid) {
    const list = FXData.TextPresets.filter(match);
    grid.appendChild(U.el("div", "fx-cat", "Teks (klik untuk tambah ke timeline)"));
    if (!list.length) { grid.appendChild(U.el("div", "empty", "Tidak ada hasil.")); return; }
    list.forEach((tp) => {
      const el = U.el("div", "fx-item tx");
      el.appendChild(FXThumb.el("text", tp));
      el.appendChild(U.el("div", "fx-name", tp.name));
      el.addEventListener("click", () => {
        const media = Media.addText(tp.style);
        media.name = "Teks " + tp.name;
        Timeline.addMediaToPlayhead(media.id);
        App.status("Teks ditambahkan");
      });
      grid.appendChild(el);
    });
  }

  window.EffectsPanel = P;
})();
