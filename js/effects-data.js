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
    { id: "zoom", name: "Zoom", icon: "🔎" },
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

  window.FXData = { Filters, Effects, Transitions, TextPresets };
})();
