/* PremiereCut — model data & state global */
(function () {
  "use strict";

  // -------- default properties helpers --------
  function defaultTransform() {
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, anchorX: 0.5, anchorY: 0.5 };
  }
  function defaultAudio() {
    return { volume: 1, muted: false, fadeIn: 0, fadeOut: 0 };
  }
  function defaultTransition() {
    return { in: { type: "none", duration: 0 }, out: { type: "none", duration: 0 } };
  }
  function defaultMask() {
    return { enabled: false, type: "rect", x: 0.5, y: 0.5, w: 0.6, h: 0.6, feather: 0, invert: false };
  }
  function defaultChroma() {
    return { enabled: false, color: "#00ff00", tolerance: 0.30, softness: 0.10, spill: 0.15 };
  }

  const App = {
    project: null,
    selection: { clipId: null, mediaId: null },
    playhead: 0,
    playing: false,
    pxPerSec: 80,
    fps: 30,
    mediaEls: {},      // mediaId -> HTMLVideoElement|HTMLAudioElement|HTMLImageElement
    undoStack: [],
    redoStack: [],
    _listeners: {},
    _dragPayload: null,
  };

  App.defaults = {
    transform: defaultTransform,
    audio: defaultAudio,
    transition: defaultTransition,
    mask: defaultMask,
    chroma: defaultChroma,
  };

  App.newProject = function () {
    return {
      name: "Untitled Project",
      size: { w: 1920, h: 1080 },
      fps: 30,
      media: [],
      tracks: [
        { id: U.uid("trk"), type: "video", name: "V2", clips: [], gain: 1, muted: false, solo: false },
        { id: U.uid("trk"), type: "video", name: "V1", clips: [], gain: 1, muted: false, solo: false },
        { id: U.uid("trk"), type: "audio", name: "A1", clips: [], gain: 1, muted: false, solo: false },
        { id: U.uid("trk"), type: "audio", name: "A2", clips: [], gain: 1, muted: false, solo: false },
      ],
    };
  };

  // -------- events --------
  App.on = function (name, fn) {
    (App._listeners[name] = App._listeners[name] || []).push(fn);
  };
  App.emit = function (name, payload) {
    (App._listeners[name] || []).forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  };

  // -------- lookups --------
  App.getMedia = function (id) { return App.project.media.find((m) => m.id === id); };
  App.getTrack = function (id) { return App.project.tracks.find((t) => t.id === id); };
  App.getClip = function (id) {
    for (const t of App.project.tracks) {
      const c = t.clips.find((x) => x.id === id);
      if (c) return c;
    }
    return null;
  };
  App.getClipTrack = function (id) {
    for (const t of App.project.tracks) if (t.clips.some((x) => x.id === id)) return t;
    return null;
  };
  App.selectedClip = function () { return App.selection.clipId ? App.getClip(App.selection.clipId) : null; };

  App.clipDuration = function (c) {
    const inP = c.inPoint || 0;
    const outP = c.outPoint != null ? c.outPoint : (c.duration || 0);
    const raw = Math.max(0, outP - inP);
    const spd = c.speed || 1;
    return raw / (spd || 1);
  };

  App.select = function (clipId) {
    App.selection.clipId = clipId || null;
    App.emit("select", clipId);
    App.emit("project");
  };

  // -------- factory --------
  App.makeClip = function (media, trackType) {
    const isText = media.type === "text";
    const dur = isText ? 4 : (media.duration || 5);
    const clip = {
      id: U.uid("clip"),
      mediaId: media.id,
      trackType: trackType || (media.type === "audio" ? "audio" : "video"),
      start: 0,
      inPoint: 0,
      outPoint: dur,
      speed: 1,
      name: media.name,
      transform: defaultTransform(),
      audio: defaultAudio(),
      transition: defaultTransition(),
      keyframes: {},
      mask: defaultMask(),
      chroma: defaultChroma(),
      filters: [],
      effects: [],
      text: isText
        ? { content: media.name || "Teks Baru", font: "Inter", size: 72, color: "#ffffff", bg: "transparent",
            bold: true, italic: false, align: "center", x: 0.5, y: 0.5, shadow: true }
        : null,
    };
    return clip;
  };

  // -------- undo / redo --------
  function snapshot() {
    return JSON.stringify({ project: App.project, selection: App.selection });
  }
  App.pushUndo = function () {
    App.undoStack.push(snapshot());
    if (App.undoStack.length > 100) App.undoStack.shift();
    App.redoStack.length = 0;
    App.emit("history");
  };
  App.undo = function () {
    if (!App.undoStack.length) return;
    App.redoStack.push(snapshot());
    const s = JSON.parse(App.undoStack.pop());
    App.project = s.project; App.selection = s.selection;
    App.emit("project"); App.emit("history");
  };
  App.redo = function () {
    if (!App.redoStack.length) return;
    App.undoStack.push(snapshot());
    const s = JSON.parse(App.redoStack.pop());
    App.project = s.project; App.selection = s.selection;
    App.emit("project"); App.emit("history");
  };

  // -------- duration --------
  App.sequenceDuration = function () {
    let end = 0;
    App.project.tracks.forEach((t) => t.clips.forEach((c) => {
      end = Math.max(end, c.start + App.clipDuration(c));
    }));
    return end;
  };

  App.status = function (msg) {
    const el = document.getElementById("statusText");
    if (el) el.textContent = msg;
  };

  App.project = App.newProject();
  window.App = App;
})();
