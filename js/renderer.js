/* PremiereCut — renderer preview (canvas compositor) */
(function () {
  "use strict";

  const R = { canvas: null, ctx: null };

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

  // Bangun string CSS filter dari clip.filters
  R.filterString = function (clip) {
    const parts = [];
    if (clip.filters) {
      clip.filters.forEach((f) => {
        const def = FXData.Filters.find((x) => x.id === f.id);
        if (def && f.intensity > 0) parts.push(def.fn(f.intensity));
      });
    }
    return parts.length ? parts.join(" ") : "none";
  };

  // Efek mod transform gabungan
  function effectTransform(clip, t) {
    let scale = 1, scaleX = 1, scaleY = 1, dx = 0, dy = 0, rot = 0;
    (clip.effects || []).forEach((e) => {
      const def = FXData.Effects.find((x) => x.id === e.id);
      if (def && def.mod && e.intensity > 0) {
        const m = def.mod(t, e.intensity) || {};
        scale *= m.scale || 1; scaleX *= m.scaleX || 1; scaleY *= m.scaleY || 1;
        dx += m.dx || 0; dy += m.dy || 0; rot += m.rot || 0;
      }
    });
    return { scale, scaleX, scaleY, dx, dy, rot };
  }

  // Transisi -> modifikasi opacity & offset & overlay
  function transitionState(clip, t) {
    const st = { opacityMul: 1, dx: 0, dy: 0, scaleMul: 1, overlay: null };
    const dur = App.clipDuration(clip);
    const tt = t - clip.start;
    const tr = clip.transition || {};
    const W = App.project.size.w, H = App.project.size.h;
    if (tr.in && tr.in.type !== "none" && tr.in.duration > 0) {
      const p = U.clamp(tt / tr.in.duration, 0, 1);
      applyTransitionEdge(st, tr.in.type, p, true, W, H);
    }
    if (tr.out && tr.out.type !== "none" && tr.out.duration > 0) {
      const p = U.clamp((dur - tt) / tr.out.duration, 0, 1);
      applyTransitionEdge(st, tr.out.type, p, false, W, H);
    }
    return st;
  }
  function applyTransitionEdge(st, type, p, isIn, W, H) {
    switch (type) {
      case "fade": st.opacityMul *= p; break;
      case "dipBlack": st.opacityMul *= p; st.overlay = "rgba(0,0,0," + (1 - p).toFixed(3) + ")"; break;
      case "dipWhite": st.opacityMul *= p; break;
      case "slideL": st.dx += isIn ? (1 - p) * W : -(1 - p) * W; break;
      case "slideR": st.dx += isIn ? -(1 - p) * W : (1 - p) * W; break;
      case "slideU": st.dy += isIn ? (1 - p) * H : -(1 - p) * H; break;
      case "zoom": st.scaleMul *= p; break;
    }
  }

  // Hitung rect "contain" media ke dalam frame proyek
  function containRect(mw, mh, fw, fh) {
    if (!mw || !mh) return { x: 0, y: 0, w: fw, h: fh };
    const s = Math.min(fw / mw, fh / mh);
    const w = mw * s, h = mh * s;
    return { x: (fw - w) / 2, y: (fh - h) / 2, w, h };
  }

  function drawClip(ctx, clip, t) {
    const W = App.project.size.w, H = App.project.size.h;
    const transform = clip.transform || App.defaults.transform();
    const ts = transitionState(clip, t);
    const et = effectTransform(clip, t);

    ctx.save();
    ctx.globalAlpha = U.clamp((transform.opacity != null ? transform.opacity : 1) * ts.opacityMul, 0, 1);
    ctx.filter = R.filterString(clip);

    if (clip.text) {
      drawText(ctx, clip, W, H, transform, ts, et);
    } else {
      const media = App.getMedia(clip.mediaId);
      const el = App.mediaEls[clip.mediaId];
      if (!media || !el) { ctx.restore(); return; }
      const mw = media.width || el.videoWidth || el.naturalWidth || W;
      const mh = media.height || el.videoHeight || el.naturalHeight || H;
      let rect = containRect(mw, mh, W, H);

      const scale = (transform.scale || 1) * et.scale * ts.scaleMul;
      const sx = et.scaleX, sy = et.scaleY;
      const cx = transform.x + (transform.anchorX != null ? transform.anchorX : 0.5) * W;
      const cy = transform.y + (transform.anchorY != null ? transform.anchorY : 0.5) * H;

      ctx.translate(cx + ts.dx + et.dx, cy + ts.dy + et.dy);
      ctx.rotate((transform.rotation || 0) + et.rot);
      ctx.scale(scale * sx, scale * sy);

      try {
        if (media.type === "image") {
          ctx.drawImage(el, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
        } else if (el.readyState >= 2) {
          ctx.drawImage(el, -rect.w / 2, -rect.h / 2, rect.w, rect.h);
        }
      } catch (e) { /* frame belum siap */ }

      if (ts.overlay) { ctx.filter = "none"; ctx.fillStyle = ts.overlay; ctx.fillRect(-W, -H, W * 2, H * 2); }
    }
    ctx.restore();
  }

  function drawText(ctx, clip, W, H, transform, ts, et) {
    const tx = clip.text;
    ctx.filter = "none";
    const fontPx = tx.size || 72;
    ctx.font = (tx.italic ? "italic " : "") + (tx.bold ? "700 " : "400 ") + fontPx + "px " + (tx.font || "Inter") + ", sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const lines = String(tx.content || "").split("\n");
    const lh = fontPx * 1.2;
    const cx = (tx.x != null ? tx.x : 0.5) * W + (transform.x || 0) + ts.dx;
    const cy = (tx.y != null ? tx.y : 0.5) * H + (transform.y || 0) + ts.dy;
    const scale = (transform.scale || 1) * et.scale * ts.scaleMul;
    ctx.translate(cx, cy); ctx.rotate((transform.rotation || 0) + et.rot); ctx.scale(scale * et.scaleX, scale * et.scaleY);

    // background box
    if (tx.bg && tx.bg !== "transparent") {
      let maxW = 0;
      lines.forEach((ln) => { maxW = Math.max(maxW, ctx.measureText(ln).width); });
      const padX = fontPx * 0.4, padY = fontPx * 0.28;
      ctx.fillStyle = tx.bg;
      ctx.fillRect(-maxW / 2 - padX, -(lines.length * lh) / 2 - padY, maxW + padX * 2, lines.length * lh + padY * 2);
    }
    ctx.fillStyle = tx.color || "#fff";
    if (tx.shadow) { ctx.shadowColor = "rgba(0,0,0,.65)"; ctx.shadowBlur = fontPx * 0.12; ctx.shadowOffsetY = fontPx * 0.04; }
    lines.forEach((ln, i) => ctx.fillText(ln, 0, -((lines.length - 1) * lh) / 2 + i * lh));
  }

  // Render seluruh frame pada waktu t
  R.drawFrame = function (t) {
    const ctx = R.ctx, W = R.canvas.width, H = R.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.filter = "none"; ctx.globalAlpha = 1;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

    const tracks = App.project.tracks;
    // gambar dari bawah ke atas: index besar -> kecil
    for (let i = tracks.length - 1; i >= 0; i--) {
      const trk = tracks[i];
      if (trk.type === "audio") continue;
      for (const clip of trk.clips) {
        const dur = App.clipDuration(clip);
        if (t >= clip.start && t < clip.start + dur) drawClip(ctx, clip, t);
      }
    }

    // efek post dari semua klip aktif
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none"; ctx.globalAlpha = 1;
    tracks.forEach((trk) => {
      if (trk.type === "audio") return;
      trk.clips.forEach((clip) => {
        const dur = App.clipDuration(clip);
        if (t < clip.start || t >= clip.start + dur) return;
        const localT = t - clip.start;
        (clip.effects || []).forEach((e) => {
          const def = FXData.Effects.find((x) => x.id === e.id);
          if (def && def.post && e.intensity > 0) { try { def.post(ctx, W, H, localT, e.intensity); } catch (err) {} }
        });
      });
    });
  };

  R.seek = function (t) {
    const tracks = App.project.tracks;
    tracks.forEach((trk) => trk.clips.forEach((clip) => {
      if (clip.text) return;
      const media = App.getMedia(clip.mediaId);
      if (!media || media.type === "image") return;
      const el = App.mediaEls[clip.mediaId];
      if (!el) return;
      const dur = App.clipDuration(clip);
      const active = t >= clip.start && t < clip.start + dur;
      if (active) {
        const want = clip.inPoint + (t - clip.start) * (clip.speed || 1);
        if (Math.abs(el.currentTime - want) > 0.12) { try { el.currentTime = Math.max(0, want); } catch (e) {} }
      }
    }));
  };

  window.Renderer = R;
})();
