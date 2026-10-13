/* PremiereCut — timeline multi-track */
(function () {
  "use strict";

  const T = {};
  const GUTTER = 64, RULER_H = 26, VH = 56, AH = 46;
  const MIN_DUR = 0.1;

  T.init = function () {
    T.scroll = document.getElementById("timelineScroll");
    T.inner = document.getElementById("timelineInner");

    document.getElementById("timelineZoom").addEventListener("input", (e) => { App.pxPerSec = +e.target.value; T.render(); });
    document.getElementById("tlZoomIn").addEventListener("click", () => T.zoomBy(1.25));
    document.getElementById("tlZoomOut").addEventListener("click", () => T.zoomBy(0.8));
    document.getElementById("btnAddVideoTrack").addEventListener("click", () => T.addTrack("video"));
    document.getElementById("btnAddAudioTrack").addEventListener("click", () => T.addTrack("audio"));

    App.on("project", T.render);
    App.on("media", T.render);
    App.on("seek", T.updatePlayhead);
    App.on("select", T.render);
    T.render();
  };

  T.zoomBy = function (f) {
    App.pxPerSec = U.clamp(App.pxPerSec * f, 10, 300);
    document.getElementById("timelineZoom").value = App.pxPerSec;
    T.render();
  };

  function totalTrackH() {
    return App.project.tracks.reduce((a, t) => a + (t.type === "audio" ? AH : VH), 0);
  }
  function videoTrackCount() {
    let n = 0; App.project.tracks.forEach((t) => { if (t.type === "video") n++; }); return n;
  }

  T.trackHeight = function (track) { return track.type === "audio" ? AH : VH; };

  function tickStep(pps) {
    const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    for (const s of steps) if (s * pps >= 64) return s;
    return 600;
  }

  // ---------- RENDER ----------
  T.render = function () {
    if (!T.inner) return;
    const pps = App.pxPerSec;
    const sl = T.scroll.scrollLeft, st = T.scroll.scrollTop;
    const dur = Math.max(App.sequenceDuration() + 5, 16);
    const lanesW = Math.max(dur * pps, T.scroll.clientWidth - GUTTER - 8);

    T.inner.innerHTML = "";
    T.lanesW = lanesW;

    // ruler
    const ruler = U.el("div", "tl-ruler");
    ruler.style.width = lanesW + "px";
    const step = tickStep(pps);
    for (let t = 0; t <= dur + step; t += step) {
      const tick = U.el("div", "tick", U.formatDur(t));
      tick.style.left = (t * pps) + "px";
      ruler.appendChild(tick);
    }
    T.inner.appendChild(ruler);
    T.ruler = ruler;

    // row: gutter + lanes
    const row = U.el("div", "tl-row");
    const gutter = U.el("div", "tl-gutter");
    const lanes = U.el("div", "tl-lanes");
    lanes.style.width = lanesW + "px";

    App.project.tracks.forEach((track) => {
      const lab = U.el("div", "tl-track-label" + (track.type === "audio" ? " audio" : ""));
      lab.style.height = T.trackHeight(track) + "px";
      lab.dataset.trackId = track.id;
      const name = U.el("span", "tt-name", track.name);
      lab.appendChild(name);
      const btns = U.el("div", "tt-btn", "✕");
      btns.title = "Hapus track";
      btns.addEventListener("click", (e) => { e.stopPropagation(); T.removeTrack(track.id); });
      lab.appendChild(btns);
      gutter.appendChild(lab);

      const lane = U.el("div", "tl-track" + (track.type === "audio" ? " audio" : ""));
      lane.style.height = T.trackHeight(track) + "px";
      lane.dataset.trackId = track.id;
      // drop dari media bin
      lane.addEventListener("dragover", (e) => { e.preventDefault(); lane.classList.add("drop"); });
      lane.addEventListener("dragleave", () => lane.classList.remove("drop"));
      lane.addEventListener("drop", (e) => {
        e.preventDefault(); lane.classList.remove("drop");
        if (!App._dragPayload) return;
        const t = Math.max(0, T.xToTime(e.clientX));
        T.dropPayload(App._dragPayload, track.id, t);
        App._dragPayload = null;
      });
      lane.addEventListener("mousedown", (e) => { if (e.target === lane) { App.select(null); } });

      track.clips.forEach((clip) => lane.appendChild(T.clipEl(clip, track)));
      lanes.appendChild(lane);
    });

    row.appendChild(gutter);
    row.appendChild(lanes);
    T.inner.appendChild(row);
    T.lanes = lanes;

    // playhead
    const ph = U.el("div", "tl-playhead", '<div class="tl-playhead-cap"></div>');
    ph.style.height = (RULER_H + totalTrackH()) + "px";
    ph.id = "tlPlayhead";
    T.inner.appendChild(ph);
    T.playheadEl = ph;

    // ruler seek
    ruler.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const move = (ev) => T.seek(T.xToTime(ev.clientX));
      move(e);
      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    });

    T.scroll.scrollLeft = sl; T.scroll.scrollTop = st;
    T.updatePlayhead();
  };

  T.updatePlayhead = function () {
    if (!T.playheadEl) return;
    T.playheadEl.style.left = (GUTTER + App.playhead * App.pxPerSec) + "px";
    const mt = document.getElementById("monitorTime");
    if (mt) mt.textContent = U.timecode(App.playhead, App.fps);
    const info = document.getElementById("statusInfo");
    if (info) info.textContent = "Playhead " + U.formatDur(App.playhead);
  };

  T.xToTime = function (clientX) {
    const r = T.lanes.getBoundingClientRect();
    return Math.max(0, (clientX - r.left) / App.pxPerSec);
  };

  T.seek = function (t) {
    const dur = App.sequenceDuration();
    App.playhead = U.clamp(t, 0, Math.max(dur, t));
    Renderer.seek(App.playhead);
    Renderer.drawFrame(App.playhead);
    T.updatePlayhead();
  };

  T.clipEl = function (clip, track) {
    const pps = App.pxPerSec;
    const dur = App.clipDuration(clip);
    const media = App.getMedia(clip.mediaId);
    const kind = clip.text ? "text" : (media ? media.type : "video");
    const c = U.el("div", "tl-clip " + kind + (App.selection.clipId === clip.id ? " sel" : ""));
    c.style.left = (clip.start * pps) + "px";
    c.style.width = Math.max(6, dur * pps) + "px";
    c.dataset.clipId = clip.id;

    if ((kind === "video" || kind === "image") && media && media.thumb) {
      const th = U.el("div", "cl-thumb");
      th.style.backgroundImage = "url(" + media.thumb + ")";
      c.appendChild(th);
    }
    if (kind === "audio") {
      const w = U.el("div", "cl-wave");
      w.style.background = "repeating-linear-gradient(90deg, rgba(255,255,255,.5) 0 2px, transparent 2px 5px)";
      c.appendChild(w);
    }
    const label = U.el("div", "cl-label", (clip.text ? "T " : "") + (clip.name || "clip"));
    c.appendChild(label);

    const badges = [];
    if (clip.speed && clip.speed !== 1) badges.push(clip.speed + "x");
    if (clip.filters && clip.filters.length) badges.push("fx");
    if (badges.length) c.appendChild(U.el("div", "cl-badge", badges.join(" ")));

    const hl = U.el("div", "handle l"), hr = U.el("div", "handle r");
    c.appendChild(hl); c.appendChild(hr);

    hl.addEventListener("mousedown", (e) => { e.stopPropagation(); T.beginTrim(e, clip, "l"); });
    hr.addEventListener("mousedown", (e) => { e.stopPropagation(); T.beginTrim(e, clip, "r"); });
    c.addEventListener("mousedown", (e) => { T.beginMove(e, clip); });
    c.addEventListener("dblclick", () => { App.select(clip.id); Playback.toggle(false); });
    return c;
  };

  // ---------- snapping ----------
  function snapCandidates(excludeClip, trackType) {
    const cands = [0, App.playhead, App.sequenceDuration()];
    App.project.tracks.forEach((t) => {
      if (t.type !== trackType) return;
      t.clips.forEach((c) => { if (c.id !== excludeClip) { cands.push(c.start); cands.push(c.start + App.clipDuration(c)); } });
    });
    return cands;
  }
  function snapTime(t, excludeClip, trackType) {
    const thr = 8 / App.pxPerSec;
    let best = t, bestD = thr;
    snapCandidates(excludeClip, trackType).forEach((c) => { const d = Math.abs(c - t); if (d < bestD) { bestD = d; best = c; } });
    return best;
  }

  // ---------- MOVE ----------
  T.beginMove = function (e, clip) {
    e.preventDefault();
    App.select(clip.id);
    const startX = e.clientX, startY = e.clientY;
    const origStart = clip.start;
    const origTrack = App.getClipTrack(clip.id);
    App.pushUndo();
    let moved = false;

    const move = (ev) => {
      const dxSec = (ev.clientX - startX) / App.pxPerSec;
      let ns = Math.max(0, origStart + dxSec);
      ns = snapTime(ns, clip.id, origTrack.type);
      clip.start = ns;
      moved = true;

      // pindah track (vertikal)
      const targetTrack = T.trackAtY(ev.clientY);
      if (targetTrack && targetTrack.type === origTrack.type) {
        const src = App.getClipTrack(clip.id);
        if (src && src.id !== targetTrack.id) {
          src.clips = src.clips.filter((x) => x.id !== clip.id);
          targetTrack.clips.push(clip);
        }
      }
      const elClip = T.inner.querySelector('[data-clip-id="' + clip.id + '"]');
      if (elClip) { elClip.style.left = (clip.start * App.pxPerSec) + "px"; }
      const trackNow = App.getClipTrack(clip.id);
      if (trackNow) {
        const laneNow = T.lanes.children[App.project.tracks.indexOf(trackNow)];
        if (elClip && laneNow && elClip.parentElement !== laneNow) laneNow.appendChild(elClip);
      }
    };
    const up = () => {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      if (moved) { T.emitClipChanged(clip); T.render(); }
    };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  T.trackAtY = function (clientY) {
    const lanes = T.lanes.children;
    for (let i = 0; i < lanes.length; i++) {
      const r = lanes[i].getBoundingClientRect();
      if (clientY >= r.top && clientY <= r.bottom) return App.project.tracks[i];
    }
    return null;
  };

  // ---------- TRIM ----------
  T.beginTrim = function (e, clip, side) {
    e.preventDefault();
    App.select(clip.id);
    const startX = e.clientX;
    const media = App.getMedia(clip.mediaId);
    const sourceLimited = media && !clip.text && media.type !== "image";
    const maxSource = media ? (media.duration || 0) : 0;
    const orig = { start: clip.start, inPoint: clip.inPoint, outPoint: clip.outPoint, dur: App.clipDuration(clip) };
    App.pushUndo();

    const move = (ev) => {
      const d = (ev.clientX - startX) / App.pxPerSec;
      const speed = clip.speed || 1;
      if (side === "r") {
        let nd = Math.max(MIN_DUR, orig.dur + d);
        if (sourceLimited) nd = Math.min(nd, (maxSource - clip.inPoint) / speed);
        clip.outPoint = clip.inPoint + nd * speed;
      } else {
        let ns = orig.start + d;
        let dd = d;
        if (ns < 0) { dd = -orig.start; ns = 0; }
        let nd = orig.dur - dd;
        if (nd < MIN_DUR) { nd = MIN_DUR; ns = orig.start + (orig.dur - MIN_DUR); dd = orig.dur - MIN_DUR; }
        clip.start = ns;
        if (sourceLimited) { clip.inPoint = Math.max(0, orig.inPoint + dd * speed); }
        else { clip.inPoint = 0; }
        clip.outPoint = clip.inPoint + nd * speed;
      }
      const el = T.inner.querySelector('[data-clip-id="' + clip.id + '"]');
      if (el) {
        el.style.left = (clip.start * App.pxPerSec) + "px";
        el.style.width = Math.max(6, App.clipDuration(clip) * App.pxPerSec) + "px";
      }
      Inspector.render();
    };
    const up = () => {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      T.emitClipChanged(clip); T.render();
    };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  };

  T.emitClipChanged = function (clip) {
    App.emit("clipChanged", clip);
    App.status("Diperbarui: " + (clip.name || "clip"));
  };

  // ---------- DROP payload ----------
  T.dropPayload = function (payload, trackId, time) {
    const track = App.getTrack(trackId);
    if (!track) return;
    if (payload.kind === "media") {
      const media = App.getMedia(payload.mediaId);
      if (!media) return;
      if (media.type === "audio" && track.type !== "audio") { App.status("Media audio harus di track audio"); return; }
      if (media.type !== "audio" && track.type !== "video") { App.status("Media visual harus di track video"); return; }
      App.pushUndo();
      const clip = App.makeClip(media, track.type);
      clip.start = snapTime(Math.max(0, time), clip.id, track.type);
      if (media.preset) Object.assign(clip.text, media.preset);
      track.clips.push(clip);
      track.clips.sort((a, b) => a.start - b.start);
      App.select(clip.id);
      App.emit("project");
    }
  };

  T.addMediaToPlayhead = function (mediaId) {
    const media = App.getMedia(mediaId);
    if (!media) return;
    let track;
    if (media.type === "audio") track = App.project.tracks.find((t) => t.type === "audio");
    else track = App.project.tracks.find((t) => t.type === "video");
    if (!track) { track = T.addTrack(media.type === "audio" ? "audio" : "video", true); }
    T.dropPayload({ kind: "media", mediaId }, track.id, App.playhead);
    App.status("Ditambahkan ke " + track.name);
  };

  // ---------- TRACK ops ----------
  T.addTrack = function (type, silent) {
    App.pushUndo();
    const n = App.project.tracks.filter((t) => t.type === type).length + 1;
    const track = { id: U.uid("trk"), type, name: (type === "video" ? "V" : "A") + n, clips: [] };
    if (type === "video") {
      // video track baru ditaruh di atas track video pertama (jadi paling atas)
      const firstVideoIdx = App.project.tracks.findIndex((t) => t.type === "video");
      const at = firstVideoIdx < 0 ? 0 : firstVideoIdx;
      App.project.tracks.splice(at, 0, track);
    } else {
      App.project.tracks.push(track);
    }
    if (!silent) App.emit("project");
    else App.emit("project");
    return track;
  };

  T.removeTrack = function (id) {
    const t = App.getTrack(id);
    if (!t) return;
    if (App.project.tracks.filter((x) => x.type === t.type).length <= 1) { App.status("Minimal 1 track " + t.type); return; }
    App.pushUndo();
    App.project.tracks = App.project.tracks.filter((x) => x.id !== id);
    App.emit("project");
  };

  // ---------- SPLIT ----------
  T.splitAtPlayhead = function () {
    const t = App.playhead;
    let did = false;
    App.project.tracks.forEach((track) => {
      const newClips = [];
      track.clips.forEach((clip) => {
        const dur = App.clipDuration(clip);
        if (t > clip.start + 0.02 && t < clip.start + dur - 0.02) {
          if (!did) { App.pushUndo(); did = true; }
          const speed = clip.speed || 1;
          const cutSec = (t - clip.start) * speed;
          const left = JSON.parse(JSON.stringify(clip));
          const right = JSON.parse(JSON.stringify(clip));
          left.id = U.uid("clip"); right.id = U.uid("clip");
          left.outPoint = clip.inPoint + cutSec;
          right.start = t;
          right.inPoint = clip.inPoint + cutSec;
          right.outPoint = clip.outPoint;
          right.transition = App.defaults.transition(); right.transition.in = { type: "none", duration: 0 };
          newClips.push(left, right);
        } else newClips.push(clip);
      });
      track.clips = newClips.sort((a, b) => a.start - b.start);
    });
    if (did) { App.emit("project"); App.status("Split di " + U.formatDur(t)); }
  };

  T.deleteSelection = function () {
    const clip = App.selectedClip();
    if (!clip) return;
    App.pushUndo();
    const track = App.getClipTrack(clip.id);
    track.clips = track.clips.filter((c) => c.id !== clip.id);
    App.select(null);
    App.emit("project");
  };

  window.Timeline = T;
})();
