/* PremiereCut — katalog filter, efek, transisi, teks (gaya CapCut) */
(function () {
  "use strict";

  // ---------- FILTERS (CSS filter berbasis intensitas) ----------
  // fn(i) -> string CSS filter, i = 0..1
  const Filters = [
    { id: "bright", name: "Cerah", group: "Dasar", icon: "☀️", fn: (i) => `brightness(${1 + 0.6 * i})` },
    { id: "dark", name: "Gelap", group: "Dasar", icon: "🌑", fn: (i) => `brightness(${1 - 0.6 * i})` },
    { id: "contrast", name: "Kontras", group: "Dasar", icon: "◐", fn: (i) => `contrast(${1 + 0.8 * i})` },
    { id: "saturate", name: "Vivid", group: "Warna", icon: "🎨", fn: (i) => `saturate(${1 + 1.2 * i})` },
    { id: "desaturate", name: "Pudar", group: "Warna", icon: "🩶", fn: (i) => `saturate(${1 - 0.9 * i})` },
    { id: "grayscale", name: "B&W", group: "Warna", icon: "⬛", fn: (i) => `grayscale(${i})` },
    { id: "sepia", name: "Sepia", group: "Warna", icon: "🏜️", fn: (i) => `sepia(${0.9 * i})` },
    { id: "warm", name: "Hangat", group: "Warna", icon: "🔥", fn: (i) => `sepia(${0.35 * i}) saturate(${1 + 0.5 * i}) brightness(${1 + 0.06 * i})` },
    { id: "cool", name: "Dingin", group: "Warna", icon: "❄️", fn: (i) => `hue-rotate(${-14 * i}deg) saturate(${1 + 0.2 * i}) brightness(${1 + 0.03 * i})` },
    { id: "hue", name: "Hue Shift", group: "Warna", icon: "🌈", fn: (i) => `hue-rotate(${180 * i}deg)` },
    { id: "invert", name: "Invert", group: "Artistik", icon: "🔃", fn: (i) => `invert(${i})` },
    { id: "vintage", name: "Vintage", group: "Artistik", icon: "📷", fn: (i) => `sepia(${0.5 * i}) contrast(${1 + 0.25 * i}) saturate(${1 - 0.35 * i}) brightness(${1 - 0.05 * i})` },
    { id: "fade", name: "Fade", group: "Artistik", icon: "🌫️", fn: (i) => `contrast(${1 - 0.4 * i}) brightness(${1 + 0.18 * i}) saturate(${1 - 0.2 * i})` },
    { id: "cyber", name: "Cyber", group: "Artistik", icon: "🟣", fn: (i) => `hue-rotate(${280 * i}deg) saturate(${1 + 1.3 * i}) contrast(${1 + 0.3 * i})` },
    { id: "blur", name: "Blur", group: "Artistik", icon: "💧", fn: (i) => `blur(${6 * i}px)` },
    { id: "sharp", name: "Tajam", group: "Dasar", icon: "🔺", fn: (i) => `contrast(${1 + 0.5 * i}) saturate(${1 + 0.15 * i})` },
    { id: "vivid2", name: "Vivid +", group: "Warna", icon: "🟥", fn: (i) => `saturate(${1 + 2 * i}) contrast(${1 + 0.35 * i})` },
    { id: "noir", name: "Noir", group: "Artistik", icon: "🎩", fn: (i) => `grayscale(${0.7 * i}) contrast(${1 + 0.6 * i}) brightness(${1 - 0.08 * i})` },
    { id: "teal", name: "Teal & Orange", group: "Warna", icon: "🎬", fn: (i) => `hue-rotate(${-8 * i}deg) saturate(${1 + 0.6 * i}) contrast(${1 + 0.2 * i})` },
    { id: "dream", name: "Dreamy", group: "Artistik", icon: "☁️", fn: (i) => `brightness(${1 + 0.15 * i}) saturate(${1 + 0.3 * i}) blur(${1.5 * i}px)` },
    { id: "cold", name: "Cinematic Cold", group: "Warna", icon: "🧊", fn: (i) => `hue-rotate(${-20 * i}deg) saturate(${1 + 0.15 * i}) contrast(${1 + 0.35 * i})` },
    { id: "sunset", name: "Sunset", group: "Warna", icon: "🌇", fn: (i) => `sepia(${0.28 * i}) hue-rotate(${-12 * i}deg) saturate(${1 + 0.8 * i})` },
    { id: "matrix", name: "Matrix", group: "Artistik", icon: "🟩", fn: (i) => `hue-rotate(${90 * i}deg) saturate(${1 + 0.8 * i}) contrast(${1 + 0.2 * i}) grayscale(${0.3 * i})` },
    { id: "pop", name: "Pop Art", group: "Artistik", icon: "🎈", fn: (i) => `saturate(${1 + 2.5 * i}) contrast(${1 + 0.5 * i}) hue-rotate(${8 * i}deg)` },
  ];

  // ---------- EFFECTS (post-processing canvas) ----------
  // mod(t, i) -> { dx, dy, scale, scaleX, scaleY, rot } transform tambahan
  // post(ctx, w, h, t, i) -> gambar overlay di atas frame
  const Effects = [
    {
      id: "zoomPulse", name: "Zoom Pulse", group: "Gerak", icon: "🔍", tStart: 0,
      mod: (t, i) => ({ scale: 1 + 0.06 * i * Math.sin(t * 2 * Math.PI) }),
    },
    {
      id: "shake", name: "Shake", group: "Gerak", icon: "📳",
      mod: (t, i) => { const a = 14 * i; return { dx: (Math.random() - 0.5) * a, dy: (Math.random() - 0.5) * a, rot: (Math.random() - 0.5) * 0.01 * i }; },
    },
    {
      id: "zoomInSlow", name: "Zoom In Slow", group: "Gerak", icon: "➕",
      mod: (t, i) => ({ scale: 1 + 0.12 * i * (t % 6) / 6 }),
    },
    {
      id: "mirror", name: "Mirror", group: "Gerak", icon: "🪞",
      mod: (t, i) => ({ scaleX: -1 }),
    },
    {
      id: "vignette", name: "Vignette", group: "Cahaya", icon: "🔲",
      post: (ctx, w, h, t, i) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${0.85 * i})`);
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      },
    },
    {
      id: "grain", name: "Film Grain", group: "Tekstur", icon: "🌾",
      post: (ctx, w, h, t, i) => {
        const n = 1400 * i;
        ctx.save(); ctx.globalAlpha = 0.10 * i;
        for (let k = 0; k < n; k++) { const x = Math.random() * w, y = Math.random() * h; ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000"; ctx.fillRect(x, y, 1.5, 1.5); }
        ctx.restore();
      },
    },
    {
      id: "leak", name: "Light Leak", group: "Cahaya", icon: "🌅",
      post: (ctx, w, h, t, i) => {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, `rgba(255,180,80,${0.35 * i})`); g.addColorStop(1, "rgba(255,80,120,0)");
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
      },
    },
    {
      id: "glitch", name: "RGB Glitch", group: "Tekstur", icon: "📺",
      post: (ctx, w, h, t, i) => {
        if (Math.random() > 0.35 - 0.25 * i) return;
        const shift = 4 + 10 * i;
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.5;
        ctx.drawImage(ctx.canvas, shift, 0, w, h); ctx.restore();
      },
    },
    {
      id: "bw", name: "High B&W", group: "Cahaya", icon: "◻️",
      post: (ctx, w, h, t, i) => {
        ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = i;
        ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h); ctx.restore();
      },
    },
    {
      id: "filmBars", name: "Film Bars", group: "Tekstur", icon: "🎞️",
      post: (ctx, w, h, t, i) => {
        const bh = h * 0.11 * i; ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, bh); ctx.fillRect(0, h - bh, w, bh);
      },
    },
    {
      id: "scan", name: "Scanlines", group: "Tekstur", icon: "📼",
      post: (ctx, w, h, t, i) => {
        ctx.save(); ctx.globalAlpha = 0.25 * i; ctx.fillStyle = "#000";
        for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1.5);
        ctx.restore();
      },
    },
    {
      id: "flash", name: "Flash", group: "Cahaya", icon: "⚡",
      post: (ctx, w, h, t, i) => {
        const a = Math.max(0, Math.sin(t * 8) * 0.5) * i;
        if (a > 0.02) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.restore(); }
      },
    },
    {
      id: "pixelate", name: "Pixelate", group: "Tekstur", icon: "🟦",
      post: (ctx, w, h, t, i) => {
        if (i <= 0) return; const px = Math.max(2, Math.round(4 + 40 * i));
        try { const tmp = document.createElement("canvas"); tmp.width = Math.max(1, Math.round(w / px)); tmp.height = Math.max(1, Math.round(h / px)); const tc = tmp.getContext("2d"); tc.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, w, h); ctx.imageSmoothingEnabled = true; } catch (e) {}
      },
    },
    {
      id: "chromaPulse", name: "RGB Pulse", group: "Gerak", icon: "🟥",
      mod: (t, i) => ({ scale: 1 + 0.02 * i * Math.sin(t * 6) }),
    },
    {
      id: "bounce", name: "Bounce", group: "Gerak", icon: "🏀",
      mod: (t, i) => { const per = 0.7; const ph = (t % per) / per; const bounce = Math.abs(Math.sin(ph * Math.PI)) * (1 - ph); return { dy: -bounce * 120 * i }; },
    },
    {
      id: "sway", name: "Sway", group: "Gerak", icon: "🌊",
      mod: (t, i) => ({ rot: Math.sin(t * 1.5) * 0.06 * i, dx: Math.sin(t * 1.1) * 30 * i }),
    },
  ];

  // ---------- TRANSITIONS ----------
  const Transitions = [
    { id: "none", name: "Tanpa", icon: "∅" },
    { id: "fade", name: "Fade", icon: "🌓" },
    { id: "dipBlack", name: "Dip to Black", icon: "⚫" },
    { id: "dipWhite", name: "Dip to White", icon: "⚪" },
    { id: "slideL", name: "Slide Left", icon: "⬅️" },
    { id: "slideR", name: "Slide Right", icon: "➡️" },
    { id: "slideU", name: "Slide Up", icon: "⬆️" },
    { id: "slideD", name: "Slide Down", icon: "⬇️" },
    { id: "zoom", name: "Zoom", icon: "🔎" },
    { id: "zoomOut", name: "Zoom Out", icon: "🔍" },
    { id: "wipeL", name: "Wipe Left", icon: "◀" },
    { id: "wipeR", name: "Wipe Right", icon: "▶" },
    { id: "iris", name: "Iris", icon: "◎" },
  ];

  // ---------- TEXT PRESETS ----------
  const TextPresets = [
    { id: "plain", name: "Basic", icon: "T", style: { size: 72, color: "#ffffff", bg: "transparent", bold: true, italic: false } },
    { id: "title", name: "Title", icon: "🏷️", style: { size: 96, color: "#ffffff", bg: "transparent", bold: true } },
    { id: "subtitle", name: "Subtitle", icon: "💬", style: { size: 52, color: "#ffffff", bg: "rgba(0,0,0,0.55)", bold: false } },
    { id: "pop", name: "Pop", icon: "💥", style: { size: 88, color: "#ffe600", bg: "transparent", bold: true } },
    { id: "neon", name: "Neon", icon: "🟢", style: { size: 88, color: "#39ff14", bg: "transparent", bold: true } },
    { id: "box", name: "Box", icon: "🧱", style: { size: 64, color: "#111111", bg: "#ffe600", bold: true } },
  ];

  // ---------- TEMPLATES (combo filter + effect + transisi) ----------
  const Templates = [
    { id: "tpl_tiktok", name: "TikTok Pop", icon: "🎵", filters: [{ id: "saturate", intensity: 0.8 }, { id: "contrast", intensity: 0.4 }], effects: [{ id: "zoomPulse", intensity: 0.5 }], transition: "zoom" },
    { id: "tpl_cine", name: "Cinematic", icon: "🎬", filters: [{ id: "cold", intensity: 0.7 }, { id: "contrast", intensity: 0.3 }], effects: [{ id: "filmBars", intensity: 1 }, { id: "vignette", intensity: 0.6 }], transition: "fade" },
    { id: "tpl_vlog", name: "Vlog Warm", icon: "📹", filters: [{ id: "warm", intensity: 0.7 }, { id: "bright", intensity: 0.3 }], effects: [{ id: "leak", intensity: 0.4 }], transition: "fade" },
    { id: "tpl_retro", name: "Retro 80s", icon: "🕹️", filters: [{ id: "vintage", intensity: 0.8 }], effects: [{ id: "scan", intensity: 0.6 }, { id: "grain", intensity: 0.5 }], transition: "slideL" },
    { id: "tpl_neon", name: "Neon Night", icon: "🌃", filters: [{ id: "cyber", intensity: 0.9 }, { id: "contrast", intensity: 0.4 }], effects: [{ id: "glitch", intensity: 0.5 }], transition: "zoom" },
    { id: "tpl_bw", name: "Mono Drama", icon: "⬛", filters: [{ id: "noir", intensity: 0.9 }], effects: [{ id: "vignette", intensity: 0.8 }, { id: "grain", intensity: 0.4 }], transition: "dipBlack" },
    { id: "tpl_dream", name: "Dreamy", icon: "☁️", filters: [{ id: "dream", intensity: 0.8 }], effects: [{ id: "leak", intensity: 0.5 }], transition: "fade" },
    { id: "tpl_action", name: "Action", icon: "💥", filters: [{ id: "contrast", intensity: 0.6 }, { id: "warm", intensity: 0.4 }], effects: [{ id: "shake", intensity: 0.35 }, { id: "vignette", intensity: 0.5 }], transition: "wipeR" },
    { id: "tpl_clean", name: "Clean Bright", icon: "✨", filters: [{ id: "bright", intensity: 0.4 }, { id: "saturate", intensity: 0.3 }], effects: [], transition: "fade" },
  ];

  // ---------- EXPORT PRESETS ----------
  const ExportPresets = [
    { id: "yt1080", name: "YouTube 1080p", w: 1920, h: 1080, fps: 30, bitrate: 16 },
    { id: "yt720", name: "HD 720p", w: 1280, h: 720, fps: 30, bitrate: 10 },
    { id: "shorts", name: "Shorts / Reels (9:16)", w: 1080, h: 1920, fps: 30, bitrate: 12 },
    { id: "square", name: "Square (1:1)", w: 1080, h: 1080, fps: 30, bitrate: 10 },
    { id: "cinema", name: "Cinema 24fps", w: 1920, h: 1080, fps: 24, bitrate: 18 },
    { id: "web", name: "Web Kecil", w: 854, h: 480, fps: 30, bitrate: 5 },
  ];

  window.FXData = { Filters, Effects, Transitions, TextPresets, Templates, ExportPresets };
})();
