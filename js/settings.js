/* PremiereCut — panel Pengaturan (opsi global yang dapat disesuaikan) */
(function () {
  "use strict";

  const S = {};

  S.init = function () { S.render(); };

  S.open = function () { S.render(); document.getElementById("settingsModal").classList.remove("hidden"); };
  S.close = function () { document.getElementById("settingsModal").classList.add("hidden"); };

  function row(label, control, hint) {
    const r = U.el("div", "set-row");
    r.appendChild(U.el("label", null, label));
    const wrap = U.el("div", "set-ctrl");
    wrap.appendChild(control);
    if (hint) wrap.appendChild(U.el("span", "set-hint", hint));
    r.appendChild(wrap);
    return r;
  }
  function checkbox(get, set) {
    const c = document.createElement("input"); c.type = "checkbox"; c.checked = !!get();
    c.addEventListener("change", () => { set(c.checked); S.apply(); });
    return c;
  }
  function range(get, min, max, step, set, suffix) {
    const box = U.el("div", "set-range");
    const v = U.el("span", "val", get() + (suffix || ""));
    const s = document.createElement("input"); s.type = "range"; s.min = min; s.max = max; s.step = step; s.value = get();
    s.addEventListener("input", () => { set(+s.value); v.textContent = s.value + (suffix || ""); S.apply(); });
    box.appendChild(s); box.appendChild(v);
    return box;
  }
  function number(get, min, max, set, suffix) {
    const box = U.el("div", "set-range");
    const i = document.createElement("input"); i.type = "number"; i.min = min; i.max = max; i.value = get();
    i.addEventListener("change", () => { set(+i.value); S.apply(); });
    box.appendChild(i); if (suffix) box.appendChild(U.el("span", "val", suffix));
    return box;
  }
  function select(options, get, set) {
    const s = document.createElement("select");
    options.forEach((o) => s.appendChild(new Option(o[1], o[0])));
    s.value = get();
    s.addEventListener("change", () => { set(s.value); S.apply(); });
    return s;
  }
  function color(get, set) {
    const c = document.createElement("input"); c.type = "color"; c.value = get();
    c.addEventListener("input", () => { set(c.value); S.apply(); });
    return c;
  }

  function snapEditor(st) {
    const r = U.el("div", "set-row");
    r.appendChild(U.el("label", null, "Titik Snap (%)"));
    const ctrl = U.el("div", "set-ctrl");
    const wrap = U.el("div", "set-snaps");
    function renderSnaps() {
      wrap.innerHTML = "";
      (st.snapPoints || []).forEach((f, i) => {
        const chip = U.el("div", "set-snap");
        chip.appendChild(U.el("span", null, Math.round(f * 100) + "%"));
        const x = U.el("button", null, "✕"); x.type = "button"; x.title = "Hapus titik";
        x.addEventListener("click", () => { st.snapPoints.splice(i, 1); S.apply(); renderSnaps(); });
        chip.appendChild(x);
        wrap.appendChild(chip);
      });
      const addBox = U.el("div", "set-addsnap");
      const inp = document.createElement("input"); inp.type = "number"; inp.min = "5"; inp.max = "95"; inp.placeholder = "%";
      const btn = U.el("button", null, "Tambah"); btn.type = "button";
      btn.addEventListener("click", () => {
        const v = +inp.value;
        if (v >= 5 && v <= 95) {
          if (!st.snapPoints) st.snapPoints = [];
          st.snapPoints.push(v / 100);
          st.snapPoints.sort((a, b) => a - b);
          inp.value = "";
          S.apply(); renderSnaps();
        }
      });
      addBox.appendChild(inp); addBox.appendChild(btn);
      wrap.appendChild(addBox);
    }
    renderSnaps();
    ctrl.appendChild(wrap);
    r.appendChild(ctrl);
    return r;
  }

  S.render = function () {
    const body = document.getElementById("settingsBody");
    if (!body) return;
    body.innerHTML = "";
    const st = App.settings;

    body.appendChild(U.el("div", "fx-cat", "Timeline"));
    body.appendChild(row("Snapping", checkbox(() => st.snap, (v) => st.snap = v), "menempelkan klip ke klip lain"));
    body.appendChild(row("Jarak Snap", range(() => st.snapPx, 2, 24, 1, (v) => st.snapPx = v, "px")));
    body.appendChild(row("Batas Undo", number(() => st.undoLimit, 10, 500, (v) => st.undoLimit = v, "langkah")));

    body.appendChild(U.el("div", "fx-cat", "Tata Letak (Workspace)"));
    body.appendChild(row("Snap Splitter", checkbox(() => st.layoutSnap, (v) => st.layoutSnap = v), "geser pembatas menempel ke titik preset"));
    body.appendChild(snapEditor(st));
    body.appendChild(row("Panel & Layout", (function () {
      const b = U.el("button", null, "Buka Menu Layout");
      b.addEventListener("click", () => { S.close(); if (window.Layout) Layout.openMenu(); });
      return b;
    })(), "tambah / hapus / pindah panel & simpan workspace preset"));

    body.appendChild(U.el("div", "fx-cat", "Pratinjau"));
    body.appendChild(row("Warna Latar", color(() => st.bg, (v) => st.bg = v)));
    body.appendChild(row("Mode Gambar", select([["contain", "Fit (contain)"], ["cover", "Isi (cover)"], ["stretch", "Regang (stretch)"]], () => st.fitMode, (v) => st.fitMode = v)));

    body.appendChild(U.el("div", "fx-cat", "Penyimpanan"));
    body.appendChild(row("Autosave Browser", checkbox(() => st.autosave, (v) => st.autosave = v)));
    body.appendChild(row("Interval Autosave", number(() => Math.round(st.autosaveMs / 1000), 5, 300, (v) => st.autosaveMs = Math.max(5, v) * 1000, "detik")));

    body.appendChild(U.el("div", "fx-cat", "Live Caption"));
    const langs = (window.Speech && Speech.langs) ? Speech.langs() : [["id-ID", "Indonesia"]];
    body.appendChild(row("Bahasa Caption", select(langs, () => st.captionLang, (v) => st.captionLang = v)));
    body.appendChild(row("Ukuran Caption", range(() => st.captionSize, 24, 120, 2, (v) => st.captionSize = v, "px")));
  };

  S.apply = function () {
    if (window.Renderer && Renderer.drawFrame) Renderer.drawFrame(App.playhead);
    if (window.IDB && IDB.restartAutosave) IDB.restartAutosave();
    const mt = document.getElementById("monitorTime");
    void mt;
    App.status("Pengaturan diterapkan.");
  };

  S.reset = function () {
    App.settings = App.defaultSettings();
    S.render();
    S.apply();
    App.status("Pengaturan direset ke bawaan.");
  };

  window.Settings = S;
})();
