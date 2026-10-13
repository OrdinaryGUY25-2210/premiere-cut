/* PremiereCut — Inspector / Effect Controls / Color / Audio */
(function () {
  "use strict";

  const I = {};

  I.init = function () {
    App.on("select", I.render);
    App.on("project", I.render);
    App.on("seek", I.render);
    I.render();
  };

  function group(title) { const g = U.el("div", "ins-group"); g.appendChild(U.el("h4", null, title)); return g; }
  function row(label, control, valTxt) {
    const r = U.el("div", "ins-row");
    r.appendChild(U.el("label", null, label));
    r.appendChild(control);
    if (valTxt != null) r.appendChild(U.el("span", "val", valTxt));
    return r;
  }
  function slider(val, min, max, step, oninput, onchange) {
    const s = document.createElement("input");
    s.type = "range"; s.min = min; s.max = max; s.step = step; s.value = val;
    s.addEventListener("pointerdown", () => App.pushUndo());
    s.addEventListener("input", () => oninput(+s.value));
    if (onchange) s.addEventListener("change", () => onchange(+s.value));
    return s;
  }
  function apply() { Renderer.drawFrame(App.playhead); App.emit("clipChanged", App.selectedClip()); }

  // baris properti yang bisa dianimasikan dengan diamond keyframe
  function propRow(clip, prop, label, min, max, step, getStatic, setStatic, fmt) {
    const t = App.playhead;
    const animated = Keyframes.isAnimated(clip, prop);
    const cur = animated ? Keyframes.eval(clip, prop, t, getStatic()) : getStatic();
    const wrap = U.el("div", "ins-row keyed");
    wrap.appendChild(U.el("label", null, label));
    const s = slider(cur, min, max, step, (v) => {
      if (Keyframes.isAnimated(clip, prop)) Keyframes.set(clip, prop, App.playhead, v);
      else setStatic(v);
      apply(); updateVal(v);
    });
    s.classList.toggle("animated", animated);
    wrap.appendChild(s);
    const valEl = U.el("span", "val", fmt ? fmt(cur) : cur);
    wrap.appendChild(valEl);

    const dia = U.el("button", "kf-diamond" + (Keyframes.hasAt(clip, prop, t) ? " on" : "") + (animated ? " animated" : ""), "◆");
    dia.title = "Keyframe di playhead (aktifkan animasi)";
    dia.addEventListener("click", () => {
      App.pushUndo();
      const cv = animated ? Keyframes.eval(clip, prop, t, getStatic()) : getStatic();
      Keyframes.toggle(clip, prop, t, cv);
      I.render(); apply();
    });
    wrap.appendChild(dia);

    if (animated) {
      const nav = U.el("button", "kf-nav", "⏮");
      nav.title = "Hapus animasi (semua keyframe)";
      nav.addEventListener("click", () => { App.pushUndo(); Keyframes.clear(clip, prop); I.render(); apply(); });
      wrap.appendChild(nav);
    }
    function updateVal(v) { valEl.textContent = fmt ? fmt(v) : v; }
    return wrap;
  }

  I.render = function () {
    const clip = App.selectedClip();
    const ib = document.getElementById("inspectorBody");
    const cb = document.getElementById("colorBody");
    const ab = document.getElementById("audioBody");
    if (!ib) return;
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

    // info
    const gi = group("Clip: " + (clip.name || ""));
    gi.innerHTML += '<div class="ins-row"><label>Durasi</label><span class="mono">' + U.formatDur(App.clipDuration(clip)) + '</span></div>';
    gi.innerHTML += '<div class="ins-row"><label>Waktu</label><span class="mono">' + U.formatDur(App.playhead) + '</span></div>';
    ib.appendChild(gi);

    if (isText) ib.appendChild(textControls(clip));

    if (isVisual) {
      const gt = group("Transform (◆ = animasi)");
      gt.appendChild(propRow(clip, "x", "Posisi X", -2000, 2000, 1, () => clip.transform.x, (v) => clip.transform.x = v, (v) => Math.round(v)));
      gt.appendChild(propRow(clip, "y", "Posisi Y", -2000, 2000, 1, () => clip.transform.y, (v) => clip.transform.y = v, (v) => Math.round(v)));
      gt.appendChild(propRow(clip, "scale", "Skala", 0.05, 4, 0.01, () => clip.transform.scale, (v) => clip.transform.scale = v, (v) => v.toFixed(2)));
      gt.appendChild(propRow(clip, "rotation", "Rotasi", -180, 180, 1, () => clip.transform.rotation, (v) => clip.transform.rotation = v, (v) => Math.round(v) + "°"));
      gt.appendChild(propRow(clip, "opacity", "Opacity", 0, 1, 0.01, () => clip.transform.opacity, (v) => clip.transform.opacity = v, (v) => Math.round(v * 100) + "%"));
      ib.appendChild(gt);

      const gs = group("Kecepatan");
      gs.appendChild(row("Speed", slider(clip.speed || 1, 0.25, 4, 0.05, (v) => { clip.speed = v; apply(); }, () => App.emit("project")), (clip.speed || 1).toFixed(2) + "x"));
      const sr = U.el("div", "ins-sub");
      ["0.5", "1", "1.5", "2"].forEach((sp) => { const b = U.el("button", null, sp + "x"); b.addEventListener("click", () => { App.pushUndo(); clip.speed = +sp; I.render(); App.emit("project"); }); sr.appendChild(b); });
      gs.appendChild(sr); ib.appendChild(gs);

      ib.appendChild(maskControls(clip));
      ib.appendChild(chromaControls(clip));

      const gtr = group("Transisi");
      gtr.appendChild(transitionRow(clip, "in"));
      gtr.appendChild(transitionRow(clip, "out"));
      ib.appendChild(gtr);

      const gf = group("Filter Terpasang");
      if (!clip.filters.length) gf.appendChild(U.el("div", "empty", "Belum ada filter."));
      clip.filters.forEach((f, idx) => gf.appendChild(filterRow(clip, f, idx)));
      ib.appendChild(gf);

      const ge = group("Efek Terpasang");
      if (!clip.effects.length) ge.appendChild(U.el("div", "empty", "Belum ada efek."));
      clip.effects.forEach((e, idx) => ge.appendChild(effectRow(clip, e, idx)));
      ib.appendChild(ge);
    }

    if (isVisual) I.renderColor(cb, clip); else cb.appendChild(U.el("div", "empty", "Bukan klip visual."));
    if (media && (media.type === "video" || media.type === "audio")) I.renderAudio(ab, clip);
    else ab.appendChild(U.el("div", "empty", "Klip ini tidak punya audio."));
  };

  function textControls(clip) {
    const gi = group("Teks");
    const ta = document.createElement("textarea"); ta.rows = 2; ta.value = clip.text.content;
    ta.addEventListener("focus", () => App.pushUndo());
    ta.addEventListener("input", () => { clip.text.content = ta.value; apply(); });
    const r = U.el("div", "ins-row"); r.style.alignItems = "flex-start";
    r.appendChild(U.el("label", null, "Isi")); r.appendChild(ta); gi.appendChild(r);

    const se = document.createElement("select");
    ["Inter", "Arial", "Georgia", "Verdana", "Courier New", "Impact", "Comic Sans MS", "Times New Roman"].forEach((f) => se.appendChild(new Option(f, f)));
    se.value = clip.text.font; se.addEventListener("change", () => { clip.text.font = se.value; apply(); });
    gi.appendChild(row("Font", se));
    gi.appendChild(row("Ukuran", slider(clip.text.size, 12, 300, 1, (v) => { clip.text.size = v; apply(); }), clip.text.size));

    const cc = document.createElement("input"); cc.type = "color"; cc.value = clip.text.color;
    cc.addEventListener("input", () => { clip.text.color = cc.value; apply(); });
    const cr = U.el("div", "ins-row"); cr.appendChild(U.el("label", null, "Warna")); cr.appendChild(cc); gi.appendChild(cr);

    const bgc = document.createElement("input"); bgc.type = "color"; bgc.value = clip.text.bg && clip.text.bg !== "transparent" ? clip.text.bg : "#000000";
    const bgOn = document.createElement("input"); bgOn.type = "checkbox"; bgOn.checked = clip.text.bg !== "transparent";
    bgOn.addEventListener("change", () => { clip.text.bg = bgOn.checked ? bgc.value : "transparent"; apply(); });
    bgc.addEventListener("input", () => { clip.text.bg = bgc.value; apply(); });
    const cbr = U.el("div", "ins-row"); cbr.appendChild(U.el("label", null, "Bg")); cbr.appendChild(bgOn); cbr.appendChild(bgc); gi.appendChild(cbr);

    const bx = document.createElement("input"); bx.type = "checkbox"; bx.checked = clip.text.bold; bx.addEventListener("change", () => { clip.text.bold = bx.checked; apply(); });
    const it = document.createElement("input"); it.type = "checkbox"; it.checked = clip.text.italic; it.addEventListener("change", () => { clip.text.italic = it.checked; apply(); });
    const st = document.createElement("input"); st.type = "checkbox"; st.checked = clip.text.shadow; st.addEventListener("change", () => { clip.text.shadow = st.checked; apply(); });
    const sr = U.el("div", "ins-row"); sr.appendChild(U.el("label", null, "Gaya"));
    sr.appendChild(bx); sr.appendChild(U.el("span", null, "B")); sr.appendChild(it); sr.appendChild(U.el("span", null, "I")); sr.appendChild(st); sr.appendChild(U.el("span", null, "Shadow"));
    gi.appendChild(sr);
    gi.appendChild(row("Posisi X", slider(clip.text.x, 0, 1, 0.01, (v) => { clip.text.x = v; apply(); }), clip.text.x.toFixed(2)));
    gi.appendChild(row("Posisi Y", slider(clip.text.y, 0, 1, 0.01, (v) => { clip.text.y = v; apply(); }), clip.text.y.toFixed(2)));
    return gi;
  }

  function transitionRow(clip, which) {
    const wrap = U.el("div", "ins-row");
    wrap.appendChild(U.el("label", null, which === "in" ? "Masuk" : "Keluar"));
    const sel = document.createElement("select");
    FXData.Transitions.forEach((t) => sel.appendChild(new Option(t.name, t.id)));
    sel.value = clip.transition[which].type;
    sel.addEventListener("change", () => { App.pushUndo(); clip.transition[which].type = sel.value; apply(); });
    wrap.appendChild(sel);
    const dur = slider(clip.transition[which].duration, 0, 3, 0.1, (v) => { clip.transition[which].duration = v; apply(); });
    dur.style.flex = "1"; wrap.appendChild(dur);
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
    top.appendChild(del); box.appendChild(top);
    box.appendChild(propRow(clip, "filter:" + f.id, "Intensitas", 0, 1, 0.01, () => f.intensity, (v) => f.intensity = v, (v) => Math.round(v * 100) + "%"));
    return box;
  }
  function effectRow(clip, e, idx) {
    const def = FXData.Effects.find((x) => x.id === e.id);
    const box = U.el("div", "fx-added");
    const top = U.el("div", "fx-top");
    top.appendChild(U.el("b", null, (def ? def.icon + " " + def.name : e.id)));
    const del = U.el("span", "fx-del", "✕");
    del.addEventListener("click", () => { App.pushUndo(); clip.effects.splice(idx, 1); I.render(); apply(); });
    top.appendChild(del); box.appendChild(top);
    box.appendChild(propRow(clip, "effect:" + e.id, "Intensitas", 0, 1, 0.01, () => e.intensity, (v) => e.intensity = v, (v) => Math.round(v * 100) + "%"));
    return box;
  }

  function maskControls(clip) {
    const m = clip.mask || (clip.mask = App.defaults.mask());
    const g = group("Mask");
    const en = document.createElement("input"); en.type = "checkbox"; en.checked = m.enabled;
    en.addEventListener("change", () => { App.pushUndo(); m.enabled = en.checked; I.render(); apply(); });
    const er = U.el("div", "ins-row"); er.appendChild(U.el("label", null, "Aktif")); er.appendChild(en); g.appendChild(er);
    if (!m.enabled) return g;

    const type = document.createElement("select");
    [["rect", "Kotak"], ["ellipse", "Elips"]].forEach((t) => type.appendChild(new Option(t[1], t[0])));
    type.value = m.type; type.addEventListener("change", () => { m.type = type.value; apply(); });
    g.appendChild(row("Bentuk", type));
    g.appendChild(row("Pusat X", slider(m.x, 0, 1, 0.01, (v) => { m.x = v; apply(); }), m.x.toFixed(2)));
    g.appendChild(row("Pusat Y", slider(m.y, 0, 1, 0.01, (v) => { m.y = v; apply(); }), m.y.toFixed(2)));
    g.appendChild(row("Lebar", slider(m.w, 0.05, 1.5, 0.01, (v) => { m.w = v; apply(); }), m.w.toFixed(2)));
    g.appendChild(row("Tinggi", slider(m.h, 0.05, 1.5, 0.01, (v) => { m.h = v; apply(); }), m.h.toFixed(2)));
    g.appendChild(row("Feather", slider(m.feather, 0, 1, 0.01, (v) => { m.feather = v; apply(); }), Math.round(m.feather * 100) + "%"));
    const inv = document.createElement("input"); inv.type = "checkbox"; inv.checked = m.invert;
    inv.addEventListener("change", () => { m.invert = inv.checked; apply(); });
    const ivr = U.el("div", "ins-row"); ivr.appendChild(U.el("label", null, "Invert")); ivr.appendChild(inv); g.appendChild(ivr);
    return g;
  }

  function chromaControls(clip) {
    const c = clip.chroma || (clip.chroma = App.defaults.chroma());
    const g = group("Chroma Key (Green Screen)");
    const en = document.createElement("input"); en.type = "checkbox"; en.checked = c.enabled;
    en.addEventListener("change", () => { App.pushUndo(); c.enabled = en.checked; I.render(); apply(); });
    const er = U.el("div", "ins-row"); er.appendChild(U.el("label", null, "Aktif")); er.appendChild(en); g.appendChild(er);
    if (!c.enabled) return g;
    const col = document.createElement("input"); col.type = "color"; col.value = c.color;
    col.addEventListener("input", () => { c.color = col.value; apply(); });
    const cr = U.el("div", "ins-row"); cr.appendChild(U.el("label", null, "Warna kunci")); cr.appendChild(col); g.appendChild(cr);
    g.appendChild(row("Tolerance", slider(c.tolerance, 0, 1, 0.01, (v) => { c.tolerance = v; apply(); }), Math.round(c.tolerance * 100) + "%"));
    g.appendChild(row("Softness", slider(c.softness, 0, 1, 0.01, (v) => { c.softness = v; apply(); }), Math.round(c.softness * 100) + "%"));
    g.appendChild(row("Spill", slider(c.spill, 0, 1, 0.01, (v) => { c.spill = v; apply(); }), Math.round(c.spill * 100) + "%"));
    return g;
  }

  I.renderColor = function (root, clip) {
    const quick = [{ id: "bright", label: "Exposure" }, { id: "contrast", label: "Contrast" }, { id: "saturate", label: "Saturation" }, { id: "warm", label: "Temperature" }, { id: "vintage", label: "Vintage" }, { id: "cool", label: "Cool" }];
    quick.forEach((q) => {
      const f = clip.filters.find((x) => x.id === q.id);
      const cur = f ? f.intensity : 0;
      const s = slider(cur, 0, 1, 0.01, (v) => {
        let ff = clip.filters.find((x) => x.id === q.id);
        if (!ff) { ff = { id: q.id, intensity: v }; clip.filters.push(ff); }
        ff.intensity = v; apply();
      });
      root.appendChild(row(q.label, s, Math.round(cur * 100)));
    });
    const reset = U.el("button", null, "Reset Warna");
    reset.addEventListener("click", () => { App.pushUndo(); clip.filters = clip.filters.filter((f) => !["bright", "contrast", "saturate", "warm", "vintage", "cool"].includes(f.id)); I.render(); apply(); });
    const r = U.el("div", "ins-group"); r.appendChild(reset); root.appendChild(r);
  };

  I.renderAudio = function (root, clip) {
    const a = clip.audio;
    root.appendChild(propRow(clip, "volume", "Volume", 0, 2, 0.01, () => a.volume, (v) => a.volume = v, (v) => Math.round(v * 100) + "%"));
    const mr = U.el("div", "ins-row");
    const m = document.createElement("input"); m.type = "checkbox"; m.checked = a.muted;
    m.addEventListener("change", () => { App.pushUndo(); a.muted = m.checked; Playback.applyAudio(); });
    mr.appendChild(U.el("label", null, "Mute")); mr.appendChild(m); root.appendChild(mr);
    root.appendChild(row("Fade In", slider(a.fadeIn, 0, 5, 0.1, (v) => { a.fadeIn = v; Playback.applyAudio(); }), a.fadeIn.toFixed(1) + "s"));
    root.appendChild(row("Fade Out", slider(a.fadeOut, 0, 5, 0.1, (v) => { a.fadeOut = v; Playback.applyAudio(); }), a.fadeOut.toFixed(1) + "s"));
  };

  window.Inspector = I;
})();
