/* PremiereCut — subtitle: import SRT/VTT -> text clips */
(function () {
  "use strict";

  const S = {};

  function parseTime(str) {
    str = str.trim().replace(",", ".");
    const m = str.match(/(\d+):(\d+):(\d+)(?:\.(\d+))?/);
    if (!m) { const m2 = str.match(/(\d+):(\d+)(?:\.(\d+))?/); if (!m2) return 0; return (+m2[1]) * 60 + (+m2[2]) + (+("0." + (m2[3] || 0))); }
    const h = +m[1], mi = +m[2], se = +m[3], ms = m[4] ? +("0." + m[4]) : 0;
    return h * 3600 + mi * 60 + se + ms;
  }

  S.parse = function (text) {
    text = text.replace(/\r/g, "");
    const cues = [];
    const blocks = text.split(/\n\s*\n/);
    blocks.forEach((block) => {
      const lines = block.split("\n").filter((l) => l.trim() !== "");
      if (!lines.length) return;
      let i = 0;
      if (/^\d+$/.test(lines[0].trim())) i = 1;
      const tl = lines[i];
      if (!tl || tl.indexOf("-->") < 0) return;
      const parts = tl.split("-->");
      const start = parseTime(parts[0]);
      const end = parseTime(parts[1]);
      const contentLines = lines.slice(i + 1).filter((l) => !/^WEBVTT/i.test(l));
      const content = contentLines.join("\n").replace(/<[^>]+>/g, "");
      if (content.trim()) cues.push({ start, end: Math.max(end, start + 0.3), text: content });
    });
    return cues;
  };

  S.importFromCues = function (cues, style) {
    if (!cues.length) { App.status("Tidak ada cue subtitle yang terbaca."); return; }
    App.pushUndo();
    let track = App.project.tracks.find((t) => t.type === "video");
    if (!track) track = Timeline.addTrack("video", true);

    style = style || { size: 52, color: "#ffffff", bg: "rgba(0,0,0,0.55)", bold: false };

    cues.forEach((cue) => {
      const media = Media.addText(style);
      media.name = "Sub: " + cue.text.split("\n")[0].slice(0, 20);
      const clip = App.makeClip(media, "video");
      clip.text.content = cue.text;
      clip.text.x = 0.5; clip.text.y = 0.9;
      clip.start = cue.start;
      clip.inPoint = 0;
      clip.outPoint = cue.end - cue.start;
      track.clips.push(clip);
    });
    track.clips.sort((a, b) => a.start - b.start);
    App.emit("project"); App.emit("media");
    App.status(cues.length + " subtitle diimpor ke " + track.name);
  };

  S.importFile = function () {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".srt,.vtt,text/plain";
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { S.importFromCues(S.parse(rd.result)); };
      rd.readAsText(f);
    });
    inp.click();
  };

  window.Subtitle = S;
})();
