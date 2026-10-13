/* PremiereCut — bootstrap */
(function () {
  "use strict";

  function isTyping(e) {
    const t = e.target;
    return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
  }

  document.addEventListener("DOMContentLoaded", function () {
    Renderer.init();
    Media.init();
    Timeline.init();
    Inspector.init();
    EffectsPanel.init();
    Playback.init();
    Exporter.init();
    Menu.init();

    // transport
    document.getElementById("btnSplit").addEventListener("click", () => Timeline.splitAtPlayhead());
    document.getElementById("btnDeleteClip").addEventListener("click", () => Timeline.deleteSelection());
    document.getElementById("btnUndo").addEventListener("click", () => App.undo());
    document.getElementById("btnRedo").addEventListener("click", () => App.redo());
    document.getElementById("btnSave").addEventListener("click", () => Menu.save());
    document.getElementById("btnLoad").addEventListener("click", () => Menu.load());

    document.getElementById("zoomFit").addEventListener("change", (e) => {
      const v = e.target.value;
      const c = document.getElementById("previewCanvas");
      if (v === "fit") { c.style.width = ""; c.style.height = ""; }
      else { const pct = +v / 100; c.style.width = (App.project.size.w * pct) + "px"; c.style.height = (App.project.size.h * pct) + "px"; }
    });

    App.on("history", () => {
      document.getElementById("btnUndo").disabled = App.undoStack.length === 0;
      document.getElementById("btnRedo").disabled = App.redoStack.length === 0;
    });
    App.emit("history");

    // keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (isTyping(e)) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl) {
        const k = e.key.toLowerCase();
        if (k === "z") { e.preventDefault(); e.shiftKey ? App.redo() : App.undo(); return; }
        if (k === "y") { e.preventDefault(); App.redo(); return; }
        if (k === "s") { e.preventDefault(); Menu.save(); return; }
        if (k === "o") { e.preventDefault(); Menu.load(); return; }
        if (k === "e") { e.preventDefault(); Exporter.open(); return; }
        if (k === "i") { e.preventDefault(); document.getElementById("fileInput").click(); return; }
        if (k === "d") { e.preventDefault(); Menu.duplicate(); return; }
        if (k === "n") { e.preventDefault(); App.__newProject(); return; }
        return;
      }
      switch (e.key) {
        case " ": e.preventDefault(); Playback.toggle(); break;
        case "ArrowLeft": e.preventDefault(); Playback.stepFrame(-1); break;
        case "ArrowRight": e.preventDefault(); Playback.stepFrame(1); break;
        case "Home": Playback.seek(0); break;
        case "End": Playback.seek(App.sequenceDuration()); break;
        case "s": case "S": Timeline.splitAtPlayhead(); break;
        case "Delete": case "Backspace": Timeline.deleteSelection(); break;
      }
    });

    Renderer.drawFrame(0);
    App.status("Siap. Import media untuk mulai (Ctrl+I atau drag & drop).");

    if (location.hash === "#selftest") runSelfTest();
  });

  // self-test ringan (jalankan dengan index.html#selftest)
  function runSelfTest() {
    const out = [];
    try {
      const tm = Media.addText(FXData.TextPresets[0].style);
      const vTrack = App.project.tracks.find((t) => t.type === "video");
      Timeline.dropPayload({ kind: "media", mediaId: tm.id }, vTrack.id, 0);
      const clip = vTrack.clips[0];
      clip.filters.push({ id: "saturate", intensity: 0.8 });
      clip.effects.push({ id: "vignette", intensity: 0.5 });
      clip.transition.in = { type: "fade", duration: 0.5 };
      Playback.seek(1);
      Renderer.drawFrame(1);
      Timeline.render();
      App.select(clip.id);
      Inspector.render();
      EffectsPanel.render();
      Playback.seek(2);
      Timeline.splitAtPlayhead();
      const clipsAfter = vTrack.clips.length;
      const dur = App.sequenceDuration();
      const json = JSON.stringify(App.project).length;
      const px = Renderer.canvas.toDataURL().length;
      out.push("media=" + App.project.media.length);
      out.push("clips=" + clipsAfter);
      out.push("seqDur=" + dur.toFixed(2));
      out.push("jsonBytes=" + json);
      out.push("canvasData=" + px);
      out.push("timelineEls=" + T2count());
      out.push("RESULT=PASS");
    } catch (e) {
      out.push("RESULT=FAIL:" + e.message);
    }
    document.title = "SELFTEST|" + out.join("|");
    function T2count() { return document.querySelectorAll(".tl-clip").length; }
  }
})();
