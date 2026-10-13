/* PremiereCut — playback clock & sinkronisasi audio/video */
(function () {
  "use strict";

  const PB = { playing: false, raf: null, baseT: 0, basePerf: 0 };

  PB.init = function () {
    document.getElementById("btnPlay").addEventListener("click", () => PB.toggle());
    document.getElementById("btnGoStart").addEventListener("click", () => PB.seek(0));
    document.getElementById("btnGoEnd").addEventListener("click", () => PB.seek(App.sequenceDuration()));
    document.getElementById("btnPrevFrame").addEventListener("click", () => PB.stepFrame(-1));
    document.getElementById("btnNextFrame").addEventListener("click", () => PB.stepFrame(1));
    const mv = document.getElementById("masterVolume");
    mv.addEventListener("input", PB.applyAudio);
  };

  PB.seek = function (t) {
    App.playhead = Math.max(0, t);
    Renderer.seek(App.playhead);
    Renderer.drawFrame(App.playhead);
    Timeline.updatePlayhead();
  };

  PB.stepFrame = function (n) {
    PB.seek(App.playhead + n / App.fps);
  };

  PB.toggle = function (force) {
    const want = typeof force === "boolean" ? force : !PB.playing;
    want ? PB.play() : PB.pause();
  };

  PB.play = function () {
    const dur = App.sequenceDuration();
    if (dur <= 0) { App.status("Timeline masih kosong."); return; }
    if (App.playhead >= dur - 0.001) App.playhead = 0;
    PB.playing = true;
    PB.baseT = App.playhead;
    PB.basePerf = performance.now();
    document.getElementById("btnPlay").textContent = "❚❚";
    PB.syncMedia(true);
    loop();
  };

  function loop() {
    if (!PB.playing) return;
    const t = PB.baseT + (performance.now() - PB.basePerf) / 1000;
    const dur = App.sequenceDuration();
    if (t >= dur) {
      App.playhead = dur;
      Renderer.drawFrame(dur);
      Timeline.updatePlayhead();
      PB.pause();
      return;
    }
    App.playhead = t;
    Renderer.drawFrame(t);
    Timeline.updatePlayhead();
    PB.syncMedia(false);
    PB.raf = requestAnimationFrame(loop);
  }

  PB.pause = function () {
    PB.playing = false;
    if (PB.raf) cancelAnimationFrame(PB.raf);
    PB.raf = null;
    document.getElementById("btnPlay").textContent = "▶";
    // hentikan semua elemen
    Object.keys(App.mediaEls).forEach((id) => { const el = App.mediaEls[id]; if (el && el.pause) { try { el.pause(); } catch (e) {} } });
  };

  // sinkronkan elemen media dengan playhead
  PB.syncMedia = function (immediate) {
    const t = App.playhead;
    const activeMedia = {};
    App.project.tracks.forEach((trk) => trk.clips.forEach((clip) => {
      if (clip.text) return;
      const media = App.getMedia(clip.mediaId);
      if (!media || media.type === "image") return;
      const el = App.mediaEls[clip.mediaId];
      if (!el) return;
      const dur = App.clipDuration(clip);
      const active = t >= clip.start && t < clip.start + dur;
      if (active) {
        activeMedia[clip.mediaId] = clip;
        const want = clip.inPoint + (t - clip.start) * (clip.speed || 1);
        if (Math.abs(el.currentTime - want) > (immediate ? 0.05 : 0.35)) { try { el.currentTime = want; } catch (e) {} }
        el.playbackRate = U.clamp(clip.speed || 1, 0.25, 4);
        if (el.paused) { el.play().catch(() => {}); }
      }
    }));

    // pause media yang tidak aktif
    Object.keys(App.mediaEls).forEach((id) => {
      const el = App.mediaEls[id];
      if (!el || !el.pause) return;
      if (!activeMedia[id] && !el.paused) { try { el.pause(); } catch (e) {} }
    });

    PB.applyAudio();
  };

  PB.applyAudio = function () {
    const master = parseFloat(document.getElementById("masterVolume").value || "1");
    const t = App.playhead;
    Object.keys(App.mediaEls).forEach((id) => {
      const el = App.mediaEls[id];
      if (!el || el.volume === undefined) return;
      // cari clip aktif dari media ini
      let activeClip = null, localT = 0;
      App.project.tracks.forEach((trk) => trk.clips.forEach((clip) => {
        if (clip.mediaId !== id || clip.text) return;
        const dur = App.clipDuration(clip);
        if (t >= clip.start && t < clip.start + dur) { activeClip = clip; localT = t - clip.start; }
      }));
      if (!activeClip) { if (!el.paused) el.volume = 0; else el.volume = el.volume; return; }
      const a = activeClip.audio || { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 };
      const dur = App.clipDuration(activeClip);
      let f = 1;
      if (a.fadeIn > 0 && localT < a.fadeIn) f = Math.min(f, localT / a.fadeIn);
      if (a.fadeOut > 0 && localT > dur - a.fadeOut) f = Math.min(f, (dur - localT) / a.fadeOut);
      el.muted = !!a.muted;
      el.volume = U.clamp(a.volume * master * f, 0, 1);
    });
  };

  window.Playback = PB;
})();
