/* PremiereCut — panel Effects & Filters (gaya CapCut) */
(function () {
  "use strict";

  const P = { tab: "filter" };

  P.init = function () {
    document.getElementById("effectTabs").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      P.tab = b.dataset.tab;
      U.$$("#effectTabs button").forEach((x) => x.classList.toggle("active", x === b));
      P.render();
    });
    App.on("select", P.render);
    App.on("project", P.render);
    P.render();
  };

  P.render = function () {
    const grid = document.getElementById("effectGrid");
    if (!grid) return;
    grid.innerHTML = "";
    if (P.tab === "filter") renderGroups(grid, FXData.Filters, "filter");
    else if (P.tab === "effect") renderGroups(grid, FXData.Effects, "effect");
    else if (P.tab === "transition") renderTransitions(grid);
    else if (P.tab === "template") renderTemplates(grid);
    else renderText(grid);
  };

  function renderTemplates(grid) {
    grid.appendChild(U.el("div", "fx-cat", "Template (klik untuk terapkan ke klip terpilih)"));
    FXData.Templates.forEach((tpl) => {
      const el = U.el("div", "fx-item tpl");
      el.appendChild(U.el("div", "fx-thumb", tpl.icon));
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
    const th = U.el("div", "fx-thumb", it.icon);
    el.appendChild(th);
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
    grid.appendChild(U.el("div", "fx-cat", "Transisi (diterapkan ke klip terpilih)"));
    FXData.Transitions.forEach((tr) => {
      const el = U.el("div", "fx-item tr");
      el.appendChild(U.el("div", "fx-thumb", tr.icon));
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
    grid.appendChild(U.el("div", "fx-cat", "Teks (klik untuk tambah ke timeline)"));
    FXData.TextPresets.forEach((tp) => {
      const el = U.el("div", "fx-item tx");
      el.appendChild(U.el("div", "fx-thumb", tp.icon));
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
