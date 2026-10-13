/* PremiereCut — Audio Mixer (gain per-track, mute/solo) */
(function () {
  "use strict";

  const MX = {};

  MX.init = function () {
    App.on("project", MX.render);
    App.on("select", MX.render);
    MX.render();
  };

  MX.render = function () {
    const body = document.getElementById("mixerBody");
    if (!body) return;
    body.innerHTML = "";
    const strips = U.el("div", "mixer-strips");

    App.project.tracks.forEach((track) => {
      const strip = U.el("div", "mix-strip" + (track.type === "audio" ? " audio" : ""));
      strip.appendChild(U.el("div", "mix-name", track.name));

      const fader = document.createElement("input");
      fader.type = "range"; fader.min = 0; fader.max = 2; fader.step = 0.01;
      fader.value = track.gain != null ? track.gain : 1;
      fader.setAttribute("orient", "vertical");
      fader.className = "mix-fader";
      fader.addEventListener("input", () => { track.gain = +fader.value; Playback.applyAudio(); gainLbl.textContent = Math.round(track.gain * 100) + "%"; });
      fader.addEventListener("pointerdown", () => App.pushUndo());

      const gainLbl = U.el("div", "mix-val", Math.round((track.gain != null ? track.gain : 1) * 100) + "%");

      const btns = U.el("div", "mix-btns");
      const m = U.el("button", "mix-m" + (track.muted ? " on" : ""), "M");
      m.title = "Mute";
      m.addEventListener("click", () => { App.pushUndo(); track.muted = !track.muted; Playback.applyAudio(); MX.render(); });
      const s = U.el("button", "mix-s" + (track.solo ? " on" : ""), "S");
      s.title = "Solo";
      s.addEventListener("click", () => { App.pushUndo(); track.solo = !track.solo; Playback.applyAudio(); MX.render(); });
      btns.appendChild(m); btns.appendChild(s);

      const fbox = U.el("div", "mix-faderbox");
      fbox.appendChild(fader);
      strip.appendChild(fbox);
      strip.appendChild(gainLbl);
      strip.appendChild(btns);
      strips.appendChild(strip);
    });

    body.appendChild(strips);

    const master = U.el("div", "mix-master");
    master.innerHTML = '<span>Master</span>';
    const ms = document.createElement("input");
    ms.type = "range"; ms.min = 0; ms.max = 1; ms.step = 0.01;
    ms.value = document.getElementById("masterVolume") ? document.getElementById("masterVolume").value : 1;
    ms.addEventListener("input", () => { const mv = document.getElementById("masterVolume"); if (mv) { mv.value = ms.value; } Playback.applyAudio(); });
    master.appendChild(ms);
    body.appendChild(master);
  };

  window.AudioMixer = MX;
})();
