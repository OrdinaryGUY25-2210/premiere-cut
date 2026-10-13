/* PremiereCut — thumbnail visual untuk filter / efek / transisi / template / teks */
(function () {
  "use strict";

  const F = {};
  const SIZE = 150;

  function tmp(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

  // gambar contoh berwarna-warni (untuk menunjukkan efek warna/cahaya)
  function paintSample(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#2f4f8f");
    g.addColorStop(0.48, "#e8975a");
    g.addColorStop(0.5, "#3d6b34");
    g.addColorStop(1, "#28471f");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#ffd76a";
    ctx.beginPath(); ctx.arc(w * 0.74, h * 0.3, Math.max(6, h * 0.11), 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#356b2c";
    ctx.beginPath(); ctx.moveTo(0, h * 0.64);
    ctx.quadraticCurveTo(w * 0.3, h * 0.46, w * 0.6, h * 0.64);
    ctx.quadraticCurveTo(w * 0.85, h * 0.74, w, h * 0.6);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();

    const bars = [["#e05353", 0.06], ["#53e0a0", 0.19], ["#53a0e0", 0.32], ["#e0d653", 0.45]];
    bars.forEach((b) => { ctx.fillStyle = b[0]; ctx.fillRect(w * b[1], h * 0.07, w * 0.105, h * 0.11); });

    ctx.fillStyle = "#141414";
    ctx.beginPath(); ctx.arc(w * 0.26, h * 0.6, Math.max(4, h * 0.07), 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(w * 0.215, h * 0.65, w * 0.09, h * 0.24);
  }

  function drawTransformed(ctx, w, h, mod) {
    ctx.save();
    const scale = (mod && mod.scale) || 1;
    const sx = ((mod && mod.scaleX) || 1) * scale;
    const sy = ((mod && mod.scaleY) || 1) * scale;
    ctx.translate(w / 2 + ((mod && mod.dx) || 0), h / 2 + ((mod && mod.dy) || 0));
    ctx.rotate((mod && mod.rot) || 0);
    ctx.scale(sx, sy);
    ctx.translate(-w / 2, -h / 2);
    paintSample(ctx, w, h);
    ctx.restore();
  }

  function filtered(def, intensity) {
    let str = "";
    try { str = def.fn(intensity); } catch (e) { str = "none"; }
    return str || "none";
  }

  function runEffect(ctx, w, h, def, intensity) {
    const params = FXData.effectParams(def);
    const mod = (def.mod ? def.mod(1.0, intensity, params) : null) || {};
    drawTransformed(ctx, w, h, mod);
    if (def.post) { try { def.post(ctx, w, h, 1.0, intensity, params); } catch (e) {} }
  }

  F.render = function (canvas, kind, def) {
    const w = SIZE, h = SIZE;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none"; ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";

    if (kind === "filter") {
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, w, h);
      ctx.filter = filtered(def, 0.9);
      ctx.drawImage(sampleCanvas(w, h), 0, 0);
      ctx.filter = "none";
    } else if (kind === "effect") {
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, w, h);
      runEffect(ctx, w, h, def, 1.0);
    } else if (kind === "transition") {
      const a = sampleCanvas(w, h), b = sampleTinted(w, h);
      ctx.drawImage(a, 0, 0);
      // tampilkan transisi pada 50%: separuh kanan dengan tepi diagonal
      ctx.save();
      ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); ctx.lineTo(w * 0.58, h); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.85; ctx.drawImage(b, 0, 0);
      ctx.restore();
      ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w * 0.42, 0); ctx.lineTo(w * 0.58, h); ctx.stroke(); ctx.restore();
    } else if (kind === "template") {
      ctx.fillStyle = "#111"; ctx.fillRect(0, 0, w, h);
      let fstr = "";
      (def.filters || []).forEach((f) => { const d = FXData.Filters.find((x) => x.id === f.id); if (d) fstr += " " + d.fn(f.intensity); });
      ctx.filter = fstr.trim() || "none";
      drawTransformed(ctx, w, h, {});
      ctx.filter = "none";
      (def.effects || []).forEach((e) => { const d = FXData.Effects.find((x) => x.id === e.id); if (d && d.post) { try { d.post(ctx, w, h, 1.0, e.intensity, FXData.effectParams(d)); } catch (er) {} } });
    } else if (kind === "text") {
      drawTransformed(ctx, w, h, {});
      ctx.save(); ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(0, 0, w, h); ctx.restore();
      const st = def.style || {};
      const fs = Math.max(12, (st.size || 72) * (h / 300));
      ctx.font = (st.italic ? "italic " : "") + (st.bold ? "700 " : "400 ") + fs + "px Inter,sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      if (st.bg && st.bg !== "transparent") {
        const tw = ctx.measureText("Contoh").width, pad = fs * 0.35;
        ctx.fillStyle = st.bg; ctx.fillRect(w / 2 - tw / 2 - pad, h / 2 - fs * 0.75, tw + pad * 2, fs * 1.5);
      }
      ctx.fillStyle = st.color || "#fff";
      ctx.fillText("Contoh", w / 2, h / 2);
    }
  };

  let _sample = null, _tinted = null;
  function sampleCanvas(w, h) {
    if (!_sample) { _sample = tmp(w, h); paintSample(_sample.getContext("2d"), w, h); }
    return _sample;
  }
  function sampleTinted(w, h) {
    if (!_tinted) {
      _tinted = tmp(w, h); const c = _tinted.getContext("2d");
      paintSample(c, w, h);
      c.fillStyle = "rgba(43,127,212,.45)"; c.fillRect(0, 0, w, h);
    }
    return _tinted;
  }

  F.el = function (kind, def) {
    const wrap = U.el("div", "fx-thumb");
    const canvas = document.createElement("canvas");
    try { F.render(canvas, kind, def); } catch (e) {}
    wrap.appendChild(canvas);
    if (def && def.icon) wrap.appendChild(U.el("span", "fx-ico", def.icon));
    return wrap;
  };

  window.FXThumb = F;
})();
