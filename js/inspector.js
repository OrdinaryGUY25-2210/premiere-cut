/* PremiereCut — Inspector / Effect Controls / Color / Audio */
(function () {
  "use strict";

  const I = {};

  I.init = function () {
    App.on("select", I.render);
    App.on("project", I.render);
    I.render();
  };

  function group(title) {
    const g = U.el("div", "ins-group");
    const h = U.el("h4", null, title);
    g.appendChild(h);
    return g;
  }
  function row(label, control, valTxt) {
    const r = U.el("div", "ins-row");
    r.appendChild(U.el("label", null, label));
    r.appendChild(control);
    if (valTxt != null) r.appendChild(U.el("span", "val", valTxt));
    return r;
  }

  // slider yang commit undo saat mulai di-drag
  function slider(val, min, max, step, oninput, onchange) {
    const s = document.createElement("input");
    s.type = "range"; s.min = min; s.max = max; s.step = step; s.value = val;
    s.addEventListener("pointerdown", () => App.pushUndo());
    s.addEventListener("input", () => oninput(+s.value));
    if (onchange) s.addEventListener("change", () => onchange(+s.value));
    return s;
  }

  function numInput(val, step, oninput) {
    const n = document.createElement("input");
    n.type = "number"; n.step = step || 1; n.value = val; n.style.flex = "1";
    n.addEventListener("focus", () => App.pushUndo());
    n.addEventListener("input", () => oninput(+n.value));
    return n;
  }

  function apply() {
    Renderer.drawFrame(App.playhead);
    App.emit("clipChanged", App.selectedClip());
  }

  I.render = function () {
    const clip = App.selectedClip();
    const ib = document.getElementById("inspectorBody");
    const cb = document.getElementById("colorBody");
    const ab = document.getElementById("audioBody");
    ib.innerHTML = ""; cb.innerHTML = ""; ab.innerHTML = "";

    if (!clip) {
      ib.appendChild(U.el("div", "empty", "Pilih klip untuk mengatur properti."));
      cb.appendChild(U.el("div", "empty", "Pilih klip video."));
      ab.appendChild(U.el("div", "empty", "Pilih klip audio/video."));
      return;
    }

    const media = App.getMedia(clip.mediaId);
    const isVisual = !media || media.type !== "audio";
    const isText = !!clip.text;

    // ---------- info ----------
    const gi = group("Clip: " + (clip.name || ""));
    const durInfo = U.el("div", "ins-row");
    durInfo.innerHTML = '<label>Durasi</label><span class="mono">' + U.formatDur(App.clipDuration(clip)) + "</span>";
    gi.appendChild(durInfo);
    if (isText) {
      // teks
      const ta = document.createElement("textarea");
      ta.rows = 2; ta.value = clip.text.content;
      ta.addEventListener("focus", () => App.pushUndo());
      ta.addEventListener("input", () => { clip.text.content = ta.value; apply(); });
      const r = U.el("div", "ins-row"); r.style.alignItems = "flex-start";
      r.appendChild(U.el("label", null, "Teks")); r.appendChild(ta);
      gi.appendChild(r);

      const se = document.createElement("select");
      ["Inter", "Arial", "Georgia", "Verdana", "Courier New", "Impact", "Comic Sans MS", "Times New Roman"].forEach((f) => se.appendChild(new Option(f, f)));
      se.value = clip.text.font; se.addEventListener("change", () => { clip.text.font = se.value; apply(); });
      gi.appendChild(row("Font", se));

      const sz = slider(clip.text.size, 12, 300, 1, (v) => { clip.text.size = v; apply(); });
      gi.appendChild(row("Ukuran", sz, clip.text.size));

      const cc = document.createElement("input"); cc.type = "color"; cc.value = clip.text.color;
      cc.addEventListener("input", () => { clip.text.color = cc.value; apply(); });
      const bgc = document.createElement("input"); bgc.type = "color"; bgc.value = "#000000";
      const bgOn = document.createElement("input"); bgOn.type = "checkbox"; bgOn.checked = clip.text.bg !== "transparent";
      bgOn.addEventListener("change", () => { clip.text.bg = bgOn.checked ? bgc.value : "transparent"; apply(); });
      bgc.addEventListener("input", () => { clip.text.bg = bgc.value; apply(); });
      const cr = U.el("div", "ins-row"); cr.appendChild(U.el("label", null, "Warna")); cr.appendChild(cc);
      const cbr = U.el("div", "ins-row"); cbr.appendChild(U.el("label", null, "Bg")); cbr.appendChild(bgOn); cbr.appendChild(bgc);
      gi.appendChild(cr); gi.appendChild(cbr);

      const bx = document.createElement("input"); bx.type = "checkbox"; bx.checked = clip.text.bold;
      bx.addEventListener("change", () => { clip.text.bold = bx.checked; apply(); });
      const it = document.createElement("input"); it.type = "checkbox"; it.checked = clip.text.italic;
      it.addEventListener("change", () => { clip.text.italic = it.checked; apply(); });
      const st = document.createElement("input"); st.type = "checkbox"; st.checked = clip.text.shadow;
      st.addEventListener("change", () => { clip.text.shadow = st.checked; apply(); });
      const sr = U.el("div", "ins-row"); sr.appendChild(U.el("label", null, "Gaya"));
      sr.appendChild(bx); sr.appendChild(U.el("span", null, "B")); sr.appendChild(it); sr.appendChild(U.el("span", null, "I"));
      sr.appendChild(st); sr.appendChild(U.el("span", null, "Shadow"));
      gi.appendChild(sr);

      const px = slider(clip.text.x, 0, 1, 0.01, (v) => { clip.text.x = v; apply(); });
      gi.appendChild(row("Posisi X", px, clip.text.x.toFixed(2)));
      const py = slider(clip.text.y, 0, 1, 0.01, (v) => { clip.text.y = v; apply(); });
      gi.appendChild(row("Posisi Y", py, clip.text.y.toFixed(2)));
    }
    ib.appendChild(gi);

    // ---------- transform + speed ----------
    if (isVisual) {
      const gt = group("Transform");
      const t = clip.transform;
      gt.appendChild(row("Posisi X", slider(t.x, -2000, 2000, 1, (v) => { t.x = v; apply(); }), Math.round(t.x)));
      gt.appendChild(row("Posisi Y", slider(t.y, -2000, 2000, 1, (v) => { t.y = v; apply(); }), Math.round(t.y)));
      gt.appendChild(row("Skala", slider(t.scale, 0.05, 4, 0.01, (v) => { t.scale = v; apply(); }), t.scale.toFixed(2)));
      gt.appendChild(row("Rotasi", slider(t.rotation, -180, 180, 1, (v) => { t.rotation = v; apply(); }), t.rotation + "°"));
      gt.appendChild(row("Opacity", slider(t.opacity, 0, 1, 0.01, (v) => { t.opacity = v; apply(); }), Math.round(t.opacity * 100) + "%"));
      ib.appendChild(gt);

      const gs = group("Kecepatan");
      gs.appendChild(row("Speed", slider(clip.speed || 1, 0.25, 4, 0.05, (v) => { clip.speed = v; apply(); }, () => App.emit("project")), (clip.speed || 1).toFixed(2) + "x"));
      const sr = U.el("div", "ins-sub");
      ["0.5", "1", "1.5", "2"].forEach((sp) => {
        const b = U.el("button", null, sp + "x");
        b.addEventListener("click", () => { App.pushUndo(); clip.speed = +sp; I.render(); App.emit("project"); });
        sr.appendChild(b);
      });
      gs.appendChild(sr);
      ib.appendChild(gs);

      // ---------- transitions ----------
      const gtr = group("Transisi");
      gtr.appendChild(transitionRow(clip, "in"));
      gtr.appendChild(transitionRow(clip, "out"));
      ib.appendChild(gtr);

      // ---------- filters applied ----------
      const gf = group("Filter Terpasang");
      if (!clip.filters.length) gf.appendChild(U.el("div", "empty", "Belum ada filter. Pilih dari panel Filters."));
      clip.filters.forEach((f, idx) => gf.appendChild(filterRow(clip, f, idx)));
      ib.appendChild(gf);

      // ---------- effects applied ----------
      const ge = group("Efek Terpasang");
      if (!clip.effects.length) ge.appendChild(U.el("div", "empty", "Belum ada efek. Pilih dari panel Effects."));
      clip.effects.forEach((e, idx) => ge.appendChild(effectRow(clip, e, idx)));
      ib.appendChild(ge);
    }

    // ---------- COLOR panel ----------
    if (isVisual) { I.renderColor(cb, clip); } else cb.appendChild(U.el("div", "empty", "Bukan klip visual."));

    // ---------- AUDIO panel ----------
    if (media && (media.type === "video" || media.type === "audio")) { I.renderAudio(ab, clip); }
    else ab.appendChild(U.el("div", "empty", "Klip ini tidak punya audio."));
  };

  function transitionRow(clip, which) {
    const wrap = U.el("div", "ins-row");
    wrap.appendChild(U.el("label", null, which === "in" ? "Masuk" : "Keluar"));
    const sel = document.createElement("select");
    FXData.Transitions.forEach((t) => sel.appendChild(new Option(t.name, t.id)));
    sel.value = clip.transition[which].type;
    sel.addEventListener("change", () => { App.pushUndo(); clip.transition[which].type = sel.value; apply(); });
    wrap.appendChild(sel);
    const dur = slider(clip.transition[which].duration, 0, 3, 0.1, (v) => { clip.transition[which].duration = v; apply(); });
    dur.style.flex = "1";
    wrap.appendChild(dur);
    wrap.appendChild(U.el("span", "val", clip.transition[which].duration.toFixed(1) + "s"));
    return wrap;
  }

  function filterRow(clip, f, idx) {
    const def = FXData.Filters.find((x) => x.id === f.id);
    const box = U.el("div", "fx-added");
    const top = U.el("div", "fx-top");
    top.appendChild(U.el("b", null, (def ? def.icon + " " + def.name : f.id)));
    const del = U.el("span", "fx-del", "✕");
    del.addEventListener("click", () => { App.pushUndo(); clip.filters.splice(idx, 1); I.render(); apply(); });
    top.appendChild(del);
    box.appendChild(top);
    box.appendChild(slider(f.intensity, 0, 1, 0.01, (v) => { f.intensity = v; apply(); }));
    return box;
  }
  function effectRow(clip, e, idx) {
    const def = FXData.Effects.find((x) => x.id === e.id);
    const box = U.el("div", "fx-added");
    const top = U.el("div", "fx-top");
    top.appendChild(U.el("b", null, (def ? def.icon + " " + def.name : e.id)));
    const del = U.el("span", "fx-del", "✕");
    del.addEventListener("click", () => { App.pushUndo(); clip.effects.splice(idx, 1); I.render(); apply(); });
    top.appendChild(del);
    box.appendChild(top);
    box.appendChild(slider(e.intensity, 0, 1, 0.01, (v) => { e.intensity = v; apply(); }));
    return box;
  }

  // ---------- COLOR (Lumetri-like) ----------
  I.renderColor = function (root, clip) {
    const quick = [
      { id: "bright", label: "Exposure" },
      { id: "contrast", label: "Contrast" },
      { id: "saturate", label: "Saturation" },
      { id: "warm", label: "Temperature" },
    ];
    quick.forEach((q) => {
      const existing = clip.filters.find((f) => f.id === q.id);
      const val = existing ? existing.intensity : 0;
      const s = slider(val, 0, 1, 0.01, (v) => {
        let f = clip.filters.find((x) => x.id === q.id);
        if (!f) { f = { id: q.id, intensity: v }; clip.filters.push(f); }
        f.intensity = v; apply();
      });
      root.appendChild(row(q.label, s, Math.round(val * 100)));
    });
    const reset = U.el("button", null, "Reset Warna");
    reset.addEventListener("click", () => {
      App.pushUndo();
      clip.filters = clip.filters.filter((f) => !["bright", "contrast", "saturate", "warm"].includes(f.id));
      I.render(); apply();
    });
    const r = U.el("div", "ins-group"); r.appendChild(reset); root.appendChild(r);
  };

  // ---------- AUDIO ----------
  I.renderAudio = function (root, clip) {
    const a = clip.audio;
    root.appendChild(row("Volume", slider(a.volume, 0, 2, 0.01, (v) => { a.volume = v; Playback.applyAudio(); }), Math.round(a.volume * 100) + "%"));
    const mr = U.el("div", "ins-row");
    const m = document.createElement("input"); m.type = "checkbox"; m.checked = a.muted;
    m.addEventListener("change", () => { App.pushUndo(); a.muted = m.checked; Playback.applyAudio(); });
    mr.appendChild(U.el("label", null, "Mute")); mr.appendChild(m);
    root.appendChild(mr);
    root.appendChild(row("Fade In", slider(a.fadeIn, 0, 5, 0.1, (v) => { a.fadeIn = v; Playback.applyAudio(); }), a.fadeIn.toFixed(1) + "s"));
    root.appendChild(row("Fade Out", slider(a.fadeOut, 0, 5, 0.1, (v) => { a.fadeOut = v; Playback.applyAudio(); }), a.fadeOut.toFixed(1) + "s"));
  };

  window.Inspector = I;
})();
