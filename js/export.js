/* PremiereCut — export video via MediaRecorder */
(function () {
  "use strict";

  const X = { recorder: null, chunks: [], recording: false, cancel: false };

  X.init = function () {
    document.getElementById("btnExportTop").addEventListener("click", X.open);
    document.getElementById("expCancel").addEventListener("click", () => { X.cancel = true; X.stopRecorder(); X.close(); });
    document.getElementById("expStart").addEventListener("click", X.start);
    App.audioCtx = App.audioCtx || null;
    App.mediaSources = App.mediaSources || {};
  };

  X.open = function () {
    if (App.sequenceDuration() <= 0) { App.status("Timeline masih kosong, tidak ada yang diexport."); return; }
    document.getElementById("exportModal").classList.remove("hidden");
  };
  X.close = function () {
    document.getElementById("exportModal").classList.add("hidden");
    document.getElementById("expProgressWrap").classList.add("hidden");
  };

  X.pickMime = function () {
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    for (const m of candidates) if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    return "";
  };

  function ensureAudioGraph() {
    if (!App.audioCtx) App.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!App.audioDest) App.audioDest = App.audioCtx.createMediaStreamDestination();
    Object.keys(App.mediaEls).forEach((id) => {
      const el = App.mediaEls[id];
      if (!el || !el.play || App.mediaSources[id]) return;
      try {
        const src = App.audioCtx.createMediaElementSource(el);
        src.connect(App.audioDest);
        src.connect(App.audioCtx.destination);
        App.mediaSources[id] = src;
      } catch (e) { /* elemen tanpa audio / sudah diconnect */ }
    });
  }

  X.start = function () {
    const res = document.getElementById("expRes").value.split("x");
    const W = +res[0], H = +res[1];
    const fps = +document.getElementById("expFps").value;
    const bitrate = (+document.getElementById("expBitrate").value || 12) * 1e6;
    const withAudio = document.getElementById("expIncludeAudio").checked;
    const mime = X.pickMime();
    if (!mime) { App.status("Browser tidak mendukung MediaRecorder."); return; }

    const exp = document.createElement("canvas");
    exp.width = W; exp.height = H;
    const ectx = exp.getContext("2d");

    let stream;
    try { stream = exp.captureStream(fps); } catch (e) { stream = exp.captureStream(); }

    if (withAudio) {
      ensureAudioGraph();
      if (App.audioCtx && App.audioCtx.state === "suspended") App.audioCtx.resume();
      if (App.audioDest) App.audioDest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
    }

    X.chunks = []; X.cancel = false;
    try {
      X.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    } catch (e) {
      X.recorder = new MediaRecorder(stream);
    }
    X.recorder.ondataavailable = (e) => { if (e.data && e.data.size) X.chunks.push(e.data); };
    X.recorder.onstop = () => {
      if (!X.cancel && X.chunks.length) {
        const blob = new Blob(X.chunks, { type: mime || "video/webm" });
        U.download("premierecut-" + Date.now() + ".webm", blob);
        App.status("Export selesai: " + (blob.size / 1048576).toFixed(1) + " MB");
      } else if (X.cancel) App.status("Export dibatalkan");
    };

    // reset & mulai dari awal
    Playback.pause();
    Playback.seek(0);
    const dur = App.sequenceDuration();
    document.getElementById("expProgressWrap").classList.remove("hidden");
    document.getElementById("expStart").disabled = true;

    // beri waktu elemen media siap
    setTimeout(() => {
      X.recorder.start(1000);
      X.recording = true;
      Playback.play();

      const loop = () => {
        if (X.cancel || !X.recording) return;
        ectx.drawImage(Renderer.canvas, 0, 0, W, H);
        const pct = Math.min(100, (App.playhead / dur) * 100);
        document.getElementById("expProgressBar").style.width = pct + "%";
        document.getElementById("expProgressText").textContent = Math.round(pct) + "%";
        if (App.playhead >= dur - 0.03) { X.finish(); return; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }, 350);
  };

  X.finish = function () {
    X.recording = false;
    Playback.pause();
    setTimeout(() => X.stopRecorder(), 250);
    X.close();
    document.getElementById("expStart").disabled = false;
  };

  X.stopRecorder = function () {
    if (X.recorder && X.recorder.state !== "inactive") { try { X.recorder.stop(); } catch (e) {} }
    X.recording = false;
    document.getElementById("expStart").disabled = false;
  };

  window.Exporter = X;
})();
