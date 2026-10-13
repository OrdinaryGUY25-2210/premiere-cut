/* PremiereCut — Live Caption / auto-subtitle via Web Speech API (mikrofon) */
(function () {
  "use strict";

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const API = { running: false, rec: null, cursor: 0, interimEl: null };

  API.supported = function () { return !!SR; };

  API.open = function () {
    const m = document.getElementById("captionModal");
    if (!m) return;
    m.classList.remove("hidden");
    if (API.interimEl) API.interimEl.textContent = API.supported() ? "Siap. Tekan Mulai lalu bicara jelas ke mikrofon." : "Web Speech API tidak didukung browser ini.";
  };
  API.close = function () { const m = document.getElementById("captionModal"); if (m) m.classList.add("hidden"); };

  API.langs = function () {
    return [
      ["id-ID", "Indonesia"], ["en-US", "English (US)"], ["en-GB", "English (UK)"],
      ["ms-MY", "Melayu"], ["ja-JP", "日本語"], ["zh-CN", "中文"], ["ko-KR", "한국어"],
      ["es-ES", "Español"], ["ar-SA", "العربية"], ["fr-FR", "Français"], ["de-DE", "Deutsch"],
    ];
  };

  API.init = function () {
    API.interimEl = document.getElementById("capInterim");
    const startBtn = document.getElementById("capStart");
    const stopBtn = document.getElementById("capStop");
    const langSel = document.getElementById("capLang");
    const sizeInput = document.getElementById("capSize");
    if (!startBtn) return;
    API.langs().forEach((l) => langSel.appendChild(new Option(l[1], l[0])));
    langSel.value = App.settings.captionLang || "id-ID";
    if (!API.supported()) {
      startBtn.disabled = true;
      startBtn.title = "Browser tidak mendukung Web Speech API (coba Chrome/Edge)";
      if (API.interimEl) API.interimEl.textContent = "Web Speech API tidak didukung di browser ini.";
    }
    startBtn.addEventListener("click", () => API.start(langSel.value, +sizeInput.value || 46));
    stopBtn.addEventListener("click", API.stop);
  };

  // target track untuk caption
  function targetTrack() {
    let tr = App.project.tracks.find((t) => t.type === "video");
    if (!tr) tr = Timeline.addTrack("video", true);
    return tr;
  }

  API.start = function (lang, size) {
    if (!API.supported()) { App.status("Web Speech API tidak didukung."); return; }
    if (API.running) return;
    App.settings.captionLang = lang; App.settings.captionSize = size;
    const rec = new SR();
    rec.lang = lang || "id-ID";
    rec.continuous = true;
    rec.interimResults = true;
    API.cursor = App.playhead;
    API.running = true;

    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) API.addCue(r[0].transcript.trim(), size);
        else interim += r[0].transcript;
      }
      if (API.interimEl) API.interimEl.textContent = interim ? "… " + interim : API.interimEl.textContent;
    };
    rec.onerror = (e) => { App.status("Caption error: " + e.error); if (e.error === "not-allowed") API.stop(); };
    rec.onend = () => { if (API.running) { try { rec.start(); } catch (e) { API.stop(); } } };

    try { rec.start(); } catch (e) { App.status("Gagal mulai caption: " + e.message); API.running = false; return; }
    API.rec = rec;
    document.getElementById("capStart").disabled = true;
    document.getElementById("capStop").disabled = false;
    App.status("Live caption aktif (" + rec.lang + "). Putar media & bicara.");
  };

  API.addCue = function (text, size) {
    if (!text) return;
    const words = text.split(/\s+/).length;
    const dur = Math.max(1.0, words * 0.36);
    const tr = targetTrack();
    const media = Media.addText({ size: size || 46, color: "#ffffff", bg: "rgba(0,0,0,0.55)", bold: false });
    media.name = "Caption: " + text.slice(0, 18);
    const clip = App.makeClip(media, "video");
    clip.text.content = text;
    clip.text.x = 0.5; clip.text.y = 0.9;
    clip.start = API.cursor;
    clip.inPoint = 0;
    clip.outPoint = dur;
    tr.clips.push(clip);
    tr.clips.sort((a, b) => a.start - b.start);
    API.cursor += dur + 0.05;
    App.emit("project"); App.emit("media");
    if (API.interimEl) API.interimEl.textContent = "✓ " + text;
  };

  API.stop = function () {
    API.running = false;
    if (API.rec) { try { API.rec.stop(); } catch (e) {} API.rec = null; }
    const s = document.getElementById("capStart"), st = document.getElementById("capStop");
    if (s) s.disabled = false;
    if (st) st.disabled = true;
    App.status("Live caption dihentikan.");
  };

  window.Speech = API;
})();
