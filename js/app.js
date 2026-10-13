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
    AudioMixer.init();
    Presets.initExportPresets();
    Playback.init();
    Exporter.init();
    Menu.init();
    Settings.init();
    Speech.init();
    Commands.init();
    Layout.init();
    IDB.startAutosave();
    const expFrameBtn = document.getElementById("expFrame");
    if (expFrameBtn) expFrameBtn.addEventListener("click", () => { Renderer.exportFrame(); Exporter.close(); });

    document.getElementById("btnSearch").addEventListener("click", () => Commands.show());
    document.getElementById("btnSettings").addEventListener("click", () => Settings.open());
    const capClose = document.getElementById("capClose");
    if (capClose) capClose.addEventListener("click", () => Speech.close());
    document.getElementById("setClose").addEventListener("click", () => Settings.close());
    document.getElementById("setReset").addEventListener("click", () => Settings.reset());

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
        if (e.shiftKey && k === "s") { e.preventDefault(); IDB.save(); return; }
        if (e.shiftKey && k === "o") { e.preventDefault(); IDB.load(); return; }
        if (k === "k") { e.preventDefault(); Commands.toggle(); return; }
        if (k === "p") { e.preventDefault(); Commands.toggle(); return; }
        if (k === ",") { e.preventDefault(); Settings.open(); return; }
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
      // keyframes
      Keyframes.set(clip, "scale", 0, 1);
      Keyframes.set(clip, "scale", 2, 1.5);
      const kfEval = Keyframes.eval(clip, "scale", 1, 1).toFixed(3);
      // mask + chroma + template
      clip.mask.enabled = true; clip.mask.type = "ellipse"; clip.mask.feather = 0.3;
      clip.chroma.enabled = false;
      Presets.applyTemplate(FXData.Templates[1]);
      // subtitle import
      const cues = Subtitle.parse("1\n00:00:01,000 --> 00:00:02,500\nHalo dunia\n\n2\n00:00:03,000 --> 00:00:04,000\nBaris dua");
      Subtitle.importFromCues(cues);
      // mixer
      App.project.tracks[2].gain = 0.5; App.project.tracks[2].solo = true;
      AudioMixer.render();
      Playback.seek(1);
      Renderer.drawFrame(1);
      Timeline.render();
      App.select(clip.id);
      Inspector.render();
      EffectsPanel.render();
      EffectsPanel.tab = "template"; EffectsPanel.render();
      Playback.seek(2);
      Timeline.splitAtPlayhead();
      Playback.applyAudio();
      const dur = App.sequenceDuration();
      const json = JSON.stringify(App.project).length;
      const px = Renderer.canvas.toDataURL().length;
      // fitur baru: easing, parameter efek, palette, settings
      Keyframes.setEase(clip, "scale", "easeInOut");
      const easeVal = Keyframes.eval(clip, "scale", 1, 1).toFixed(3);
      const resolved = FXData.resolveParams(FXData.Effects.find((x) => x.id === "vignette"), { size: 0.4 });
      Commands.build();
      Settings.render();
      const tcv = document.createElement("canvas");
      let thumbOK = false;
      try { FXThumb.render(tcv, "filter", FXData.Filters[0]); thumbOK = tcv.toDataURL().length > 500; } catch (e) {}
      out.push("media=" + App.project.media.length);
      out.push("vClips=" + vTrack.clips.length);
      out.push("cues=" + cues.length);
      out.push("kfScale@1=" + kfEval);
      out.push("easeScale@1=" + easeVal);
      out.push("fxParamSize=" + resolved.size);
      out.push("cmds=" + Commands.all.length);
      out.push("thumbOK=" + thumbOK);
      out.push("layout=" + !!window.Layout);
      out.push("splitters=" + document.querySelectorAll(".v-split,.h-split").length);
      out.push("settings=" + (App.settings.snap ? "on" : "off"));
      out.push("seqDur=" + dur.toFixed(2));
      out.push("jsonBytes=" + json);
      out.push("canvasOK=" + (px > 1000));
      out.push("timelineEls=" + T2count());
      // tata letak: panel tambah/hapus/pindah + snap + workspace
      const LS = Layout.stats();
      out.push("layoutPanels=" + LS.panels);
      out.push("layoutSplitters=" + LS.splitters);
      out.push("layoutAdds=" + LS.adds);
      out.push("snapPts=" + LS.snapPoints);
      Layout.addPanel("notes", "right");
      Layout.addPanel("shortcuts", "left");
      Layout.park("mixer");
      Layout.saveWorkspace("__test__");
      const LS2 = Layout.stats();
      out.push("layoutAfterAdd=" + LS2.panels);
      out.push("layoutParked=" + LS2.parked);
      out.push("layoutSplitters2=" + LS2.splitters);
      out.push("workspace=" + (!!Layout.presets().user["__test__"] ? "ok" : "no"));
      Layout.removeWorkspace("__test__");
      out.push("RESULT=PASS");
    } catch (e) {
      out.push("RESULT=FAIL:" + e.message);
    }
    document.title = "SELFTEST|" + out.join("|");
    function T2count() { return document.querySelectorAll(".tl-clip").length; }
  }
})();
