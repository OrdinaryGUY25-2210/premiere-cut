/* PremiereCut — renderer preview (canvas compositor) */
(function () {
  "use strict";

  const R = { canvas: null, ctx: null };
  const layerCache = {}, chromaCache = {}, maskCache = {};

  function getCanvas(cache, key, w, h) {
    let c = cache[key];
    if (!c) { c = document.createElement("canvas"); cache[key] = c; }
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return c;
  }

  R.init = function () {
    R.canvas = document.getElementById("previewCanvas");
    R.ctx = R.canvas.getContext("2d", { alpha: false });
    R.resize();
    window.addEventListener("resize", R.resize);
  };

  R.resize = function () {
    const p = App.project;
    if (!p) return;
    R.canvas.width = p.size.w;
    R.canvas.height = p.size.h;
  };

  // -------- keyframe-aware transform --------
  R.evalTransform = function (clip, t) {
    const tf = clip.transform || App.defaults.transform();
    return {
      x: Keyframes.eval(clip, "x", t, tf.x),
      y: Keyframes.eval(clip, "y", t, tf.y),
      scale: Keyframes.eval(clip, "scale", t, tf.scale),
      rotation: Keyframes.eval(clip, "rotation", t, tf.rotation),
      opacity: Keyframes.eval(clip, "opacity", t, tf.opacity),
      scaleX: tf.scaleX || 1, scaleY: tf.scaleY || 1,
      anchorX: tf.anchorX != null ? tf.anchorX : 0.5,
      anchorY: tf.anchorY != null ? tf.anchorY : 0.5,
    };
  };

  R.filterIntensity = function (clip, f, t) {
    return Keyframes.isAnimated(clip, "filter:" + f.id) ? Keyframes.eval(clip, "filter:" + f.id, t, f.intensity) : f.intensity;
  };
  R.effectIntensity = function (clip, e, t) {
    return Keyframes.isAnimated(clip, "effect:" + e.id) ? Keyframes.eval(clip, "effect:" + e.id, t, e.intensity) : e.intensity;
  };

  R.filterString = function (clip, t) {
    const parts = [];
    (clip.filters || []).forEach((f) => {
      const def = FXData.Filters.find((x) => x.id === f.id);
      const iv = R.filterIntensity(clip, f, t);
      if (def && iv > 0) parts.push(def.fn(iv));
    });
    return parts.length ? parts.join(" ") : "none";
  };

  function effectTransform(clip, t) {
    let scale = 1, scaleX = 1, scaleY = 1, dx = 0, dy = 0, rot = 0;
    (clip.effects || []).forEach((e) => {
      const def = FXData.Effects.find((x) => x.id === e.id);
      const iv = R.effectIntensity(clip, e, t);
      if (def && def.mod && iv > 0) {
        const m = def.mod(t - clip.start, iv) || {};
        scale *= m.scale || 1; scaleX *= m.scaleX || 1; scaleY *= m.scaleY || 1;
        dx += m.dx || 0; dy += m.dy || 0; rot += m.rot || 0;
      }
    });
    return { scale, scaleX, scaleY, dx, dy, rot };
  }

  function transitionState(clip, t) {
    const st = { opacityMul: 1, dx: 0, dy: 0, scaleMul: 1, overlay: null, wipe: 0, iris: 0, wipeDir: null };
    const dur = App.clipDuration(clip);
    const tt = t - clip.start;
    const tr = clip.transition || {};
    const W = App.project.size.w, H = App.project.size.h;
    if (tr.in && tr.in.type !== "none" && tr.in.duration > 0) applyEdge(st, tr.in.type, U.clamp(tt / tr.in.duration, 0, 1), true, W, H);
    if (tr.out && tr.out.type !== "none" && tr.out.duration > 0) applyEdge(st, tr.out.type, U.clamp((dur - tt) / tr.out.duration, 0, 1), false, W, H);
    return st;
  }
  function applyEdge(st, type, p, isIn, W, H) {
    switch (type) {
      case "fade": st.opacityMul *= p; break;
      case "dipBlack": st.opacityMul *= p; st.overlay = "rgba(0,0,0," + (1 - p).toFixed(3) + ")"; break;
      case "dipWhite": st.opacityMul *= p; st.overlay = "rgba(255,255,255," + (1 - p).toFixed(3) + ")"; break;
      case "slideL": st.dx += isIn ? (1 - p) * W : -(1 - p) * W; break;
      case "slideR": st.dx += isIn ? -(1 - p) * W : (1 - p) * W; break;
      case "slideU": st.dy += isIn ? (1 - p) * H : -(1 - p) * H; break;
      case "slideD": st.dy += isIn ? -(1 - p) * H : (1 - p) * H; break;
      case "zoom": st.scaleMul *= p; break;
      case "zoomOut": st.scaleMul *= 0.4 + 0.6 * p; break;
      case "wipeL": st.wipe = p; st.wipeDir = "L"; break;
      case "wipeR": st.wipe = p; st.wipeDir = "R"; break;
      case "iris": st.iris = p; break;
    }
  }

  function containRect(mw, mh, fw, fh) {
    if (!mw || !mh) return { x: 0, y: 0, w: fw, h: fh };
    const s = Math.min(fw / mw, fh / mh);
    const w = mw * s, h = mh * s;
    return { x: (fw - w) / 2, y: (fh - h) / 2, w, h };
  }

  function hexToRgb(hex) {
    hex = (hex || "#00ff00").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }

  function chromaKey(srcCanvas, cfg) {
    const c = srcCanvas.getContext("2d");
    const img = c.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const d = img.data;
    const key = hexToRgb(cfg.color);
    const maxD = 441.67;
    const tol = cfg.tolerance * maxD;
    const soft = Math.max(1, cfg.softness * maxD);
    const spill = cfg.spill || 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const dist = Math.sqrt((r - key.r) * (r - key.r) + (g - key.g) * (g - key.g) + (b - key.b) * (b - key.b));
      if (dist < tol) d[i + 3] = 0;
      else if (dist < tol + soft) d[i + 3] = Math.round(255 * (dist - tol) / soft);
      if (spill > 0 && g > Math.max(r, b)) { const avg = (r + b) / 2; d[i + 1] = Math.round(g * (1 - spill) + avg * spill); }
    }
    c.putImageData(img, 0, 0);
  }

  // menggambar isi klip (media/teks) ke ctx dengan transform — dipakai fast-path & mask layer
  function drawContent(ctx, clip, t, T, ts, et, filterStr) {
    const W = App.project.size.w, H = App.project.size.h;
    ctx.save();
    ctx.globalAlpha = U.clamp((T.opacity != null ? T.opacity : 1) * ts.opacityMul, 0, 1);
    ctx.filter = filterStr || "none";

    const media = App.getMedia(clip.mediaId);
    const el = App.mediaEls[clip.mediaId];
    if (!media || !el) { ctx.restore(); return; }
    const mw = media.width || el.videoWidth || el.naturalWidth || W;
    const mh = media.height || el.videoHeight || el.naturalHeight || H;
    const rect = containRect(mw, mh, W, H);

    const scale = (T.scale || 1) * et.scale * ts.scaleMul;
    const cx = T.x + T.anchorX * W;
    const cy = T.y + T.anchorY * H;
    ctx.translate(cx + ts.dx + et.dx, cy + ts.dy + et.dy);
    ctx.rotate((T.rotation || 0) + et.rot);
    ctx.scale(scale * et.scaleX, scale * et.scaleY);

    try {
      if (media.type === "image") {
        ctx.drawImage(el, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
      } else if (el.readyState >= 2) {
        const ch = clip.chroma;
        if (ch && ch.enabled) {
          const cw = Math.min(720, Math.max(160, Math.round(rect.w)));
          const chh = Math.max(1, Math.round(cw * rect.h / rect.w));
          const cc = getCanvas(chromaCache, "ck", cw, chh);
          const cctx = cc.getContext("2d");
          cctx.clearRect(0, 0, cw, chh);
          cctx.filter = "none";
          cctx.drawImage(el, 0, 0, cw, chh);
          chromaKey(cc, ch);
          ctx.filter = "none";
          ctx.drawImage(cc, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
        } else {
          ctx.drawImage(el, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
        }
      }
    } catch (e) { /* frame belum siap */ }
    ctx.restore();
  }

  function drawMasked(maskCanvasCtx, clip, t, T, ts, et, filterStr) {
    const W = App.project.size.w, H = App.project.size.h;
    const layer = getCanvas(layerCache, "layer", W, H);
    const lctx = layer.getContext("2d");
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.clearRect(0, 0, W, H);
    drawContent(lctx, clip, t, T, ts, et, filterStr);

    const m = clip.mask;
    const mc = getCanvas(maskCache, "mask", W, H);
    const mctx = mc.getContext("2d");
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    mctx.clearRect(0, 0, W, H);
    mctx.filter = "none";
    if (m.feather > 0) mctx.filter = "blur(" + (m.feather * Math.min(W, H) * 0.08) + "px)";
    mctx.fillStyle = "#fff";
    if (m.invert) { mctx.fillRect(0, 0, W, H); mctx.globalCompositeOperation = "destination-out"; }
    const cx = m.x * W, cy = m.y * H, mw = m.w * W, mh = m.h * H;
    if (m.type === "ellipse") { mctx.beginPath(); mctx.ellipse(cx, cy, mw / 2, mh / 2, 0, 0, Math.PI * 2); mctx.fill(); }
    else mctx.fillRect(cx - mw / 2, cy - mh / 2, mw, mh);
    mctx.globalCompositeOperation = "source-over"; mctx.filter = "none";

    lctx.globalCompositeOperation = "destination-in";
    lctx.drawImage(mc, 0, 0);
    lctx.globalCompositeOperation = "source-over";
    return layer;
  }

  function drawClip(ctx, clip, t) {
    const W = App.project.size.w, H = App.project.size.h;
    const T = R.evalTransform(clip, t);
    const ts = transitionState(clip, t);
    const et = effectTransform(clip, t);
    const filterStr = R.filterString(clip, t);

    if (clip.text) {
      drawText(ctx, clip, W, H, T, ts, et);
    } else if (clip.mask && clip.mask.enabled) {
      const layer = drawMasked(ctx, clip, t, T, ts, et, filterStr);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
      applyWipeIris(ctx, ts, W, H);
      ctx.drawImage(layer, 0, 0);
      ctx.restore();
    } else {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      applyWipeIris(ctx, ts, W, H);
      drawContent(ctx, clip, t, T, ts, et, filterStr);
      ctx.restore();
    }

    if (ts.overlay) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
      ctx.fillStyle = ts.overlay; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // clip region untuk wipe/iris (dipakai di device space sebelum menggambar konten)
  function applyWipeIris(ctx, ts, W, H) {
    if (ts.wipe > 0) {
      ctx.beginPath();
      if (ts.wipeDir === "L") ctx.rect(0, 0, W * ts.wipe, H);
      else ctx.rect(W * (1 - ts.wipe), 0, W * ts.wipe, H);
      ctx.clip();
    } else if (ts.iris > 0) {
      ctx.beginPath();
      const r = Math.hypot(W, H) / 2 * ts.iris;
      ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2, true); ctx.clip();
    }
  }

  function drawText(ctx, clip, W, H, T, ts, et) {
    const tx = clip.text;
    ctx.save();
    ctx.filter = "none";
    ctx.globalAlpha = U.clamp((T.opacity != null ? T.opacity : 1) * ts.opacityMul, 0, 1);
    const fontPx = tx.size || 72;
    ctx.font = (tx.italic ? "italic " : "") + (tx.bold ? "700 " : "400 ") + fontPx + "px " + (tx.font || "Inter") + ", sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = String(tx.content || "").split("\n");
    const lh = fontPx * 1.2;
    const cx = (tx.x != null ? tx.x : 0.5) * W + (T.x || 0) + ts.dx + et.dx;
    const cy = (tx.y != null ? tx.y : 0.5) * H + (T.y || 0) + ts.dy + et.dy;
    const scale = (T.scale || 1) * et.scale * ts.scaleMul;
    ctx.translate(cx, cy); ctx.rotate((T.rotation || 0) + et.rot); ctx.scale(scale * et.scaleX, scale * et.scaleY);

    if (tx.bg && tx.bg !== "transparent") {
      let maxW = 0; lines.forEach((ln) => { maxW = Math.max(maxW, ctx.measureText(ln).width); });
      const padX = fontPx * 0.4, padY = fontPx * 0.28;
      ctx.fillStyle = tx.bg;
      ctx.fillRect(-maxW / 2 - padX, -(lines.length * lh) / 2 - padY, maxW + padX * 2, lines.length * lh + padY * 2);
    }
    ctx.fillStyle = tx.color || "#fff";
    if (tx.shadow) { ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = fontPx * 0.12; ctx.shadowOffsetY = fontPx * 0.04; }
    lines.forEach((ln, i) => ctx.fillText(ln, 0, -((lines.length - 1) * lh) / 2 + i * lh));
    ctx.restore();
  }

  R.drawFrame = function (t) {
    const ctx = R.ctx, W = R.canvas.width, H = R.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none"; ctx.globalAlpha = 1;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    const tracks = App.project.tracks;
    for (let i = tracks.length - 1; i >= 0; i--) {
      const trk = tracks[i];
      if (trk.type === "audio") continue;
      if (trk.hidden) continue;
      for (const clip of trk.clips) {
        const dur = App.clipDuration(clip);
        if (t >= clip.start && t < clip.start + dur) drawClip(ctx, clip, t);
      }
    }

    // efek post
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
    tracks.forEach((trk) => {
      if (trk.type === "audio" || trk.hidden) return;
      trk.clips.forEach((clip) => {
        const dur = App.clipDuration(clip);
        if (t < clip.start || t >= clip.start + dur) return;
        const localT = t - clip.start;
        (clip.effects || []).forEach((e) => {
          const def = FXData.Effects.find((x) => x.id === e.id);
          const iv = R.effectIntensity(clip, e, t);
          if (def && def.post && iv > 0) { try { def.post(ctx, W, H, localT, iv); } catch (err) {} }
        });
      });
    });
  };

  R.seek = function (t) {
    App.project.tracks.forEach((trk) => trk.clips.forEach((clip) => {
      if (clip.text) return;
      const media = App.getMedia(clip.mediaId);
      if (!media || media.type === "image") return;
      const el = App.mediaEls[clip.mediaId];
      if (!el) return;
      const dur = App.clipDuration(clip);
      if (t >= clip.start && t < clip.start + dur) {
        const want = clip.inPoint + (t - clip.start) * (clip.speed || 1);
        if (Math.abs(el.currentTime - want) > 0.12) { try { el.currentTime = Math.max(0, want); } catch (e) {} }
      }
    }));
  };

  // ekspor frame saat ini sebagai PNG
  R.exportFrame = function () {
    const url = R.canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "premierecut-frame-" + Date.now() + ".png";
    document.body.appendChild(a); a.click(); a.remove();
    App.status("Frame diexport sebagai PNG.");
  };

  window.Renderer = R;
})();
