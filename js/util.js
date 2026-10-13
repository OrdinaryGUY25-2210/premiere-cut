/* PremiereCut — utilitas umum */
(function () {
  "use strict";

  const U = {};

  U.uid = function (p) {
    return (p || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  };

  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  U.lerp = function (a, b, t) { return a + (b - a) * t; };

  // detik -> timecode HH:MM:SS:FF
  U.timecode = function (t, fps) {
    fps = fps || 30;
    t = Math.max(0, t);
    const totalFrames = Math.round(t * fps);
    const f = totalFrames % fps;
    const totalSec = Math.floor(totalFrames / fps);
    const s = totalSec % 60;
    const m = Math.floor(totalSec / 60) % 60;
    const h = Math.floor(totalSec / 3600);
    const p = (n) => String(n).padStart(2, "0");
    return p(h) + ":" + p(m) + ":" + p(s) + ":" + p(f);
  };

  U.formatDur = function (t) {
    if (!isFinite(t) || t <= 0) return "00:00";
    const s = Math.floor(t % 60), m = Math.floor(t / 60) % 60, h = Math.floor(t / 3600);
    const p = (n) => String(n).padStart(2, "0");
    return (h > 0 ? h + ":" : "") + (h > 0 ? p(m) : m) + ":" + p(s);
  };

  U.el = function (tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };

  U.$ = function (sel, root) { return (root || document).querySelector(sel); };
  U.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 400);
  };

  U.debounce = function (fn, ms) {
    let h; return function () { const a = arguments, c = this; clearTimeout(h); h = setTimeout(() => fn.apply(c, a), ms || 120); };
  };

  window.U = U;
})();
