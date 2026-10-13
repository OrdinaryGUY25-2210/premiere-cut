/* PremiereCut — template efek & preset ekspor */
(function () {
  "use strict";

  const PR = {};

  PR.applyTemplate = function (tpl) {
    const clip = App.selectedClip();
    if (!clip) { App.status("Pilih klip dulu di timeline."); return; }
    const media = App.getMedia(clip.mediaId);
    if (media && media.type === "audio") { App.status("Template hanya untuk klip visual."); return; }
    App.pushUndo();
    (tpl.filters || []).forEach((f) => {
      const ex = clip.filters.find((x) => x.id === f.id);
      if (ex) ex.intensity = f.intensity; else clip.filters.push({ id: f.id, intensity: f.intensity });
    });
    (tpl.effects || []).forEach((e) => {
      const ex = clip.effects.find((x) => x.id === e.id);
      if (ex) ex.intensity = e.intensity; else clip.effects.push({ id: e.id, intensity: e.intensity });
    });
    if (tpl.transition) {
      clip.transition.in.type = tpl.transition;
      if (clip.transition.in.duration === 0) clip.transition.in.duration = 0.5;
    }
    Renderer.drawFrame(App.playhead);
    Inspector.render();
    App.status("Template \"" + tpl.name + "\" diterapkan.");
  };

  // isi dropdown preset ekspor
  PR.initExportPresets = function () {
    const sel = document.getElementById("expPreset");
    if (!sel) return;
    FXData.ExportPresets.forEach((p) => sel.appendChild(new Option(p.name, p.id)));
    sel.addEventListener("change", () => {
      const p = FXData.ExportPresets.find((x) => x.id === sel.value);
      if (!p) return;
      const res = document.getElementById("expRes");
      const val = p.w + "x" + p.h;
      if ([...res.options].some((o) => o.value === val)) res.value = val;
      document.getElementById("expFps").value = String(p.fps);
      document.getElementById("expBitrate").value = p.bitrate;
    });
  };

  window.Presets = PR;
})();
