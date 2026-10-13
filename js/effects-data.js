/* PremiereCut — katalog filter, efek, transisi, teks (gaya CapCut) */
(function () {
  "use strict";

  // ---------- FILTERS ----------
  const Filters = [
    { id: "bright", name: "Cerah", group: "Dasar", icon: "☀️", tags: "bright cahaya terang", fn: (i) => `brightness(${1 + 0.6 * i})` },
    { id: "dark", name: "Gelap", group: "Dasar", icon: "🌑", tags: "dark gelap", fn: (i) => `brightness(${1 - 0.6 * i})` },
    { id: "contrast", name: "Kontras", group: "Dasar", icon: "◐", tags: "contrast kontras", fn: (i) => `contrast(${1 + 0.8 * i})` },
    { id: "sharp", name: "Tajam", group: "Dasar", icon: "🔺", tags: "sharp tajam detail", fn: (i) => `contrast(${1 + 0.5 * i}) saturate(${1 + 0.15 * i})` },
    { id: "saturate", name: "Vivid", group: "Warna", icon: "🎨", tags: "saturate vivid warna", fn: (i) => `saturate(${1 + 1.2 * i})` },
    { id: "vivid2", name: "Vivid +", group: "Warna", icon: "🟥", tags: "vivid warna pop", fn: (i) => `saturate(${1 + 2 * i}) contrast(${1 + 0.35 * i})` },
    { id: "desaturate", name: "Pudar", group: "Warna", icon: "🩶", tags: "pudar desaturate", fn: (i) => `saturate(${1 - 0.9 * i})` },
    { id: "grayscale", name: "B&W", group: "Warna", icon: "⬛", tags: "grayscale hitam putih bw", fn: (i) => `grayscale(${i})` },
    { id: "sepia", name: "Sepia", group: "Warna", icon: "🏜️", tags: "sepia coklat klasik", fn: (i) => `sepia(${0.9 * i})` },
    { id: "warm", name: "Hangat", group: "Warna", icon: "🔥", tags: "warm hangat temperature", fn: (i) => `sepia(${0.35 * i}) saturate(${1 + 0.5 * i}) brightness(${1 + 0.06 * i})` },
    { id: "cool", name: "Dingin", group: "Warna", icon: "❄️", tags: "cool dingin temperature biru", fn: (i) => `hue-rotate(${-14 * i}deg) saturate(${1 + 0.2 * i}) brightness(${1 + 0.03 * i})` },
    { id: "hue", name: "Hue Shift", group: "Warna", icon: "🌈", tags: "hue rainbow pelangi", fn: (i) => `hue-rotate(${180 * i}deg)` },
    { id: "invert", name: "Invert", group: "Artistik", icon: "🔃", tags: "invert negatif", fn: (i) => `invert(${i})` },
    { id: "vintage", name: "Vintage", group: "Artistik", icon: "📷", tags: "vintage retro", fn: (i) => `sepia(${0.5 * i}) contrast(${1 + 0.25 * i}) saturate(${1 - 0.35 * i}) brightness(${1 - 0.05 * i})` },
    { id: "fade", name: "Fade", group: "Artistik", icon: "🌫️", tags: "fade lembut pudar", fn: (i) => `contrast(${1 - 0.4 * i}) brightness(${1 + 0.18 * i}) saturate(${1 - 0.2 * i})` },
    { id: "cyber", name: "Cyber", group: "Artistik", icon: "🟣", tags: "cyber neon ungu", fn: (i) => `hue-rotate(${280 * i}deg) saturate(${1 + 1.3 * i}) contrast(${1 + 0.3 * i})` },
    { id: "noir", name: "Noir", group: "Artistik", icon: "🎩", tags: "noir hitam putih drama", fn: (i) => `grayscale(${0.7 * i}) contrast(${1 + 0.6 * i}) brightness(${1 - 0.08 * i})` },
    { id: "teal", name: "Teal & Orange", group: "Warna", icon: "🎬", tags: "teal orange cinematic film", fn: (i) => `hue-rotate(${-8 * i}deg) saturate(${1 + 0.6 * i}) contrast(${1 + 0.2 * i})` },
    { id: "dream", name: "Dreamy", group: "Artistik", icon: "☁️", tags: "dreamy mimpi soft glow", fn: (i) => `brightness(${1 + 0.15 * i}) saturate(${1 + 0.3 * i}) blur(${1.5 * i}px)` },
    { id: "cold", name: "Cinematic Cold", group: "Warna", icon: "🧊", tags: "cold cinematic biru", fn: (i) => `hue-rotate(${-20 * i}deg) saturate(${1 + 0.15 * i}) contrast(${1 + 0.35 * i})` },
    { id: "sunset", name: "Sunset", group: "Warna", icon: "🌇", tags: "sunset senja hangat", fn: (i) => `sepia(${0.28 * i}) hue-rotate(${-12 * i}deg) saturate(${1 + 0.8 * i})` },
    { id: "matrix", name: "Matrix", group: "Artistik", icon: "🟩", tags: "matrix hijau", fn: (i) => `hue-rotate(${90 * i}deg) saturate(${1 + 0.8 * i}) contrast(${1 + 0.2 * i}) grayscale(${0.3 * i})` },
    { id: "pop", name: "Pop Art", group: "Artistik", icon: "🎈", tags: "pop art warna", fn: (i) => `saturate(${1 + 2.5 * i}) contrast(${1 + 0.5 * i}) hue-rotate(${8 * i}deg)` },
    { id: "blur", name: "Blur", group: "Artistik", icon: "💧", tags: "blur buram", fn: (i) => `blur(${6 * i}px)` },
  ];

  // ---------- EFFECTS (parameter dapat diatur) ----------
  // mod(t, i, p) / post(ctx, w, h, t, i, p)
  const Effects = [
    {
      id: "zoomPulse", name: "Zoom Pulse", group: "Gerak", icon: "🔍", tags: "zoom pulse denyut",
      params: { speed: { name: "Kecepatan", min: 0.2, max: 5, step: 0.1, def: 2 }, amount: { name: "Kekuatan", min: 0.01, max: 0.5, step: 0.01, def: 0.06 } },
      mod: (t, i, p) => ({ scale: 1 + p.amount * i * Math.sin(t * p.speed * Math.PI) }),
    },
    {
      id: "shake", name: "Shake", group: "Gerak", icon: "📳", tags: "shake goyang getar",
      params: { amount: { name: "Amplitudo", min: 2, max: 80, step: 1, def: 14 } },
      mod: (t, i, p) => { const a = p.amount * i; return { dx: (Math.random() - 0.5) * a, dy: (Math.random() - 0.5) * a, rot: (Math.random() - 0.5) * 0.01 * i }; },
    },
    {
      id: "zoomInSlow", name: "Zoom In Slow", group: "Gerak", icon: "➕", tags: "zoom slow lambat ken burns",
      params: { amount: { name: "Kekuatan", min: 0.02, max: 0.6, step: 0.01, def: 0.12 }, period: { name: "Periode(s)", min: 1, max: 30, step: 0.5, def: 6 } },
      mod: (t, i, p) => ({ scale: 1 + p.amount * i * (t % p.period) / p.period }),
    },
    {
      id: "mirror", name: "Mirror", group: "Gerak", icon: "🪞", tags: "mirror cermin flip",
      params: {}, mod: () => ({ scaleX: -1 }),
    },
    {
      id: "chromaPulse", name: "RGB Pulse", group: "Gerak", icon: "🟥", tags: "rgb pulse warna",
      params: { speed: { name: "Kecepatan", min: 0.5, max: 10, step: 0.1, def: 6 }, amount: { name: "Kekuatan", min: 0.005, max: 0.2, step: 0.005, def: 0.02 } },
      mod: (t, i, p) => ({ scale: 1 + p.amount * i * Math.sin(t * p.speed) }),
    },
    {
      id: "bounce", name: "Bounce", group: "Gerak", icon: "🏀", tags: "bounce mantul lompat",
      params: { height: { name: "Tinggi", min: 10, max: 500, step: 5, def: 120 }, period: { name: "Periode(s)", min: 0.2, max: 3, step: 0.1, def: 0.7 } },
      mod: (t, i, p) => { const ph = (t % p.period) / p.period; const b = Math.abs(Math.sin(ph * Math.PI)) * (1 - ph); return { dy: -b * p.height * i }; },
    },
    {
      id: "sway", name: "Sway", group: "Gerak", icon: "🌊", tags: "sway goyang halus",
      params: { amp: { name: "Amplitudo", min: 2, max: 200, step: 2, def: 30 }, speed: { name: "Kecepatan", min: 0.2, max: 5, step: 0.1, def: 1.5 } },
      mod: (t, i, p) => ({ rot: Math.sin(t * p.speed) * 0.06 * i, dx: Math.sin(t * p.speed * 0.7) * p.amp * i }),
    },
    {
      id: "vignette", name: "Vignette", group: "Cahaya", icon: "🔲", tags: "vignette gelap tepi",
      params: { size: { name: "Ukuran", min: 0, max: 0.9, step: 0.01, def: 0.25 }, darkness: { name: "Kegelapan", min: 0.1, max: 1, step: 0.01, def: 0.85 } },
      post: (ctx, w, h, t, i, p) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * p.size, w / 2, h / 2, Math.max(w, h) * 0.72);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0," + (p.darkness * i) + ")");
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      },
    },
    {
      id: "grain", name: "Film Grain", group: "Tekstur", icon: "🌾", tags: "grain noise film tekstur",
      params: { density: { name: "Kepadatan", min: 200, max: 6000, step: 100, def: 1400 } },
      post: (ctx, w, h, t, i, p) => {
        const n = p.density * i;
        ctx.save(); ctx.globalAlpha = 0.10 * i;
        for (let k = 0; k < n; k++) { const x = Math.random() * w, y = Math.random() * h; ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000"; ctx.fillRect(x, y, 1.5, 1.5); }
        ctx.restore();
      },
    },
    {
      id: "leak", name: "Light Leak", group: "Cahaya", icon: "🌅", tags: "light leak bocor cahaya",
      params: { angle: { name: "Sudut", min: 0, max: 315, step: 15, def: 45 }, strength: { name: "Kekuatan", min: 0.05, max: 1, step: 0.05, def: 0.35 } },
      post: (ctx, w, h, t, i, p) => {
        const rad = p.angle * Math.PI / 180; const dx = Math.cos(rad) * w, dy = Math.sin(rad) * h;
        const g = ctx.createLinearGradient(0, 0, dx, dy);
        g.addColorStop(0, "rgba(255,180,80," + (p.strength * i) + ")"); g.addColorStop(1, "rgba(255,80,120,0)");
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.restore();
      },
    },
    {
      id: "glitch", name: "RGB Glitch", group: "Tekstur", icon: "📺", tags: "glitch error rgb",
      params: { chance: { name: "Peluang", min: 0, max: 1, step: 0.05, def: 0.35 }, shift: { name: "Geser", min: 2, max: 40, step: 1, def: 10 } },
      post: (ctx, w, h, t, i, p) => {
        if (Math.random() > p.chance - 0.25 * i) return;
        ctx.save(); ctx.globalCompositeOperation = "screen"; ctx.globalAlpha = 0.5;
        ctx.drawImage(ctx.canvas, p.shift * (0.4 + i), 0, w, h); ctx.restore();
      },
    },
    {
      id: "bw", name: "High B&W", group: "Cahaya", icon: "◻️", tags: "bw hitam putih",
      params: {}, post: (ctx, w, h, t, i) => { ctx.save(); ctx.globalCompositeOperation = "saturation"; ctx.globalAlpha = i; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, w, h); ctx.restore(); },
    },
    {
      id: "filmBars", name: "Film Bars", group: "Tekstur", icon: "🎞️", tags: "film bars letterbox sinema",
      params: { size: { name: "Tinggi bar", min: 0.02, max: 0.25, step: 0.01, def: 0.11 } },
      post: (ctx, w, h, t, i, p) => { const bh = h * p.size * i; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, bh); ctx.fillRect(0, h - bh, w, bh); },
    },
    {
      id: "scan", name: "Scanlines", group: "Tekstur", icon: "📼", tags: "scanlines crt vhs",
      params: { gap: { name: "Jarak", min: 2, max: 10, step: 1, def: 4 } },
      post: (ctx, w, h, t, i, p) => { ctx.save(); ctx.globalAlpha = 0.25 * i; ctx.fillStyle = "#000"; for (let y = 0; y < h; y += p.gap) ctx.fillRect(0, y, w, 1.5); ctx.restore(); },
    },
    {
      id: "flash", name: "Flash", group: "Cahaya", icon: "⚡", tags: "flash kilat",
      params: { speed: { name: "Kecepatan", min: 1, max: 20, step: 0.5, def: 8 } },
      post: (ctx, w, h, t, i, p) => { const a = Math.max(0, Math.sin(t * p.speed) * 0.5) * i; if (a > 0.02) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.restore(); } },
    },
    {
      id: "pixelate", name: "Pixelate", group: "Tekstur", icon: "🟦", tags: "pixelate pixel kotak",
      params: { block: { name: "Ukuran blok", min: 2, max: 80, step: 2, def: 20 } },
      post: (ctx, w, h, t, i, p) => {
        if (i <= 0) return; const px = Math.max(2, Math.round(2 + p.block * i));
        try { const tmp = document.createElement("canvas"); tmp.width = Math.max(1, Math.round(w / px)); tmp.height = Math.max(1, Math.round(h / px)); const tc = tmp.getContext("2d"); tc.drawImage(ctx.canvas, 0, 0, tmp.width, tmp.height); ctx.imageSmoothingEnabled = false; ctx.drawImage(tmp, 0, 0, w, h); ctx.imageSmoothingEnabled = true; } catch (e) {}
      },
    },
  ];

  function effectParams(def) {
    const out = {};
    if (def.params) Object.keys(def.params).forEach((k) => { out[k] = def.params[k].def; });
    return out;
  }
  function resolveParams(def, stored) {
    const out = effectParams(def);
    if (stored) Object.keys(stored).forEach((k) => { if (out[k] !== undefined) out[k] = stored[k]; });
    return out;
  }

  // ---------- TRANSITIONS ----------
  const Transitions = [
    { id: "none", name: "Tanpa", icon: "∅", tags: "none tanpa" },
    { id: "fade", name: "Fade", icon: "🌓", tags: "fade dissolve" },
    { id: "dipBlack", name: "Dip to Black", icon: "⚫", tags: "dip black hitam" },
    { id: "dipWhite", name: "Dip to White", icon: "⚪", tags: "dip white putih" },
    { id: "slideL", name: "Slide Left", icon: "⬅️", tags: "slide left geser kiri" },
    { id: "slideR", name: "Slide Right", icon: "➡️", tags: "slide right geser kanan" },
    { id: "slideU", name: "Slide Up", icon: "⬆️", tags: "slide up atas" },
    { id: "slideD", name: "Slide Down", icon: "⬇️", tags: "slide down bawah" },
    { id: "zoom", name: "Zoom", icon: "🔎", tags: "zoom" },
    { id: "zoomOut", name: "Zoom Out", icon: "🔍", tags: "zoom out" },
    { id: "wipeL", name: "Wipe Left", icon: "◀", tags: "wipe sapu" },
    { id: "wipeR", name: "Wipe Right", icon: "▶", tags: "wipe sapu" },
    { id: "iris", name: "Iris", icon: "◎", tags: "iris lingkaran" },
  ];

  // ---------- TEXT PRESETS ----------
  const TextPresets = [
    { id: "plain", name: "Basic", icon: "T", tags: "teks basic", style: { size: 72, color: "#ffffff", bg: "transparent", bold: true, italic: false } },
    { id: "title", name: "Title", icon: "🏷️", tags: "judul title", style: { size: 96, color: "#ffffff", bg: "transparent", bold: true } },
    { id: "subtitle", name: "Subtitle", icon: "💬", tags: "subtitle caption", style: { size: 52, color: "#ffffff", bg: "rgba(0,0,0,0.55)", bold: false } },
    { id: "pop", name: "Pop", icon: "💥", tags: "pop kuning", style: { size: 88, color: "#ffe600", bg: "transparent", bold: true } },
    { id: "neon", name: "Neon", icon: "🟢", tags: "neon hijau", style: { size: 88, color: "#39ff14", bg: "transparent", bold: true } },
    { id: "box", name: "Box", icon: "🧱", tags: "box kotak bg", style: { size: 64, color: "#111111", bg: "#ffe600", bold: true } },
  ];

  // ---------- TEMPLATES ----------
  const Templates = [
    { id: "tpl_tiktok", name: "TikTok Pop", icon: "🎵", tags: "tiktok pop sosial", filters: [{ id: "saturate", intensity: 0.8 }, { id: "contrast", intensity: 0.4 }], effects: [{ id: "zoomPulse", intensity: 0.5 }], transition: "zoom" },
    { id: "tpl_cine", name: "Cinematic", icon: "🎬", tags: "cinematic film", filters: [{ id: "cold", intensity: 0.7 }, { id: "contrast", intensity: 0.3 }], effects: [{ id: "filmBars", intensity: 1 }, { id: "vignette", intensity: 0.6 }], transition: "fade" },
    { id: "tpl_vlog", name: "Vlog Warm", icon: "📹", tags: "vlog hangat", filters: [{ id: "warm", intensity: 0.7 }, { id: "bright", intensity: 0.3 }], effects: [{ id: "leak", intensity: 0.4 }], transition: "fade" },
    { id: "tpl_retro", name: "Retro 80s", icon: "🕹️", tags: "retro vhs 80an", filters: [{ id: "vintage", intensity: 0.8 }], effects: [{ id: "scan", intensity: 0.6 }, { id: "grain", intensity: 0.5 }], transition: "slideL" },
    { id: "tpl_neon", name: "Neon Night", icon: "🌃", tags: "neon malam", filters: [{ id: "cyber", intensity: 0.9 }, { id: "contrast", intensity: 0.4 }], effects: [{ id: "glitch", intensity: 0.5 }], transition: "zoom" },
    { id: "tpl_bw", name: "Mono Drama", icon: "⬛", tags: "mono hitam putih drama", filters: [{ id: "noir", intensity: 0.9 }], effects: [{ id: "vignette", intensity: 0.8 }, { id: "grain", intensity: 0.4 }], transition: "dipBlack" },
    { id: "tpl_dream", name: "Dreamy", icon: "☁️", tags: "dreamy soft", filters: [{ id: "dream", intensity: 0.8 }], effects: [{ id: "leak", intensity: 0.5 }], transition: "fade" },
    { id: "tpl_action", name: "Action", icon: "💥", tags: "action cepat", filters: [{ id: "contrast", intensity: 0.6 }, { id: "warm", intensity: 0.4 }], effects: [{ id: "shake", intensity: 0.35 }, { id: "vignette", intensity: 0.5 }], transition: "wipeR" },
    { id: "tpl_clean", name: "Clean Bright", icon: "✨", tags: "clean bersih terang", filters: [{ id: "bright", intensity: 0.4 }, { id: "saturate", intensity: 0.3 }], effects: [], transition: "fade" },
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

  window.FXData = { Filters, Effects, Transitions, TextPresets, Templates, ExportPresets, effectParams, resolveParams };
})();
