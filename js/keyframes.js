/* PremiereCut — keyframe / animasi properti */
(function () {
  "use strict";

  const K = {};
  const EPS = 0.03;

  K.list = function (clip, prop) {
    if (!clip.keyframes) clip.keyframes = {};
    if (!clip.keyframes[prop]) clip.keyframes[prop] = [];
    return clip.keyframes[prop];
  };
  K.isAnimated = function (clip, prop) {
    return !!(clip.keyframes && clip.keyframes[prop] && clip.keyframes[prop].length);
  };
  K.hasAt = function (clip, prop, t) {
    const arr = K.list(clip, prop);
    return arr.some((k) => Math.abs(k.t - t) < EPS);
  };

  K.eval = function (clip, prop, t, fallback) {
    const arr = clip.keyframes && clip.keyframes[prop];
    if (!arr || !arr.length) return fallback;
    const sorted = arr.slice().sort((a, b) => a.t - b.t);
    if (t <= sorted[0].t) return sorted[0].v;
    if (t >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].v;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      if (t >= a.t && t <= b.t) {
        const lin = (t - a.t) / (b.t - a.t || 1);
        const p = easeValue(K.getEase(clip, prop), lin);
        return a.v + (b.v - a.v) * p;
      }
    }
    return fallback;
  };

  // easing antar-keyframe
  const EASES = ["linear", "easeIn", "easeOut", "easeInOut", "hold"];
  function easeValue(name, x) {
    switch (name) {
      case "easeIn": return x * x;
      case "easeOut": return 1 - (1 - x) * (1 - x);
      case "easeInOut": return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
      case "hold": return x < 1 ? 0 : 1;
      default: return x;
    }
  }
  K.EASES = EASES;
  K.easeValue = easeValue;
  K.getEase = function (clip, prop) { return (clip.keyframeEase && clip.keyframeEase[prop]) || "linear"; };
  K.setEase = function (clip, prop, name) { if (!clip.keyframeEase) clip.keyframeEase = {}; clip.keyframeEase[prop] = name; };


  // set/update keyframe pada waktu t
  K.set = function (clip, prop, t, v) {
    const arr = K.list(clip, prop);
    const found = arr.find((k) => Math.abs(k.t - t) < EPS);
    if (found) found.v = v; else arr.push({ t: t, v: v });
    arr.sort((a, b) => a.t - b.t);
  };

  K.remove = function (clip, prop, t) {
    const arr = K.list(clip, prop);
    const i = arr.findIndex((k) => Math.abs(k.t - t) < EPS);
    if (i >= 0) arr.splice(i, 1);
  };

  // tombol diamond: kalau ada keyframe di t -> hapus, kalau tidak -> tambah nilai sekarang
  K.toggle = function (clip, prop, t, currentValue) {
    if (K.hasAt(clip, prop, t)) K.remove(clip, prop, t);
    else K.set(clip, prop, t, currentValue);
  };

  K.clear = function (clip, prop) { if (clip.keyframes) clip.keyframes[prop] = []; };

  // properti yang mendukung animasi
  K.props = ["x", "y", "scale", "rotation", "opacity"];

  window.Keyframes = K;
})();
