/* PremiereCut — import media & media bin */
(function () {
  "use strict";

  const M = {};

  M.init = function () {
    const input = document.getElementById("fileInput");
    document.getElementById("btnImport").addEventListener("click", () => input.click());
    input.addEventListener("change", () => { M.importFiles(input.files); input.value = ""; });

    const drop = document.getElementById("mediaDrop");
    ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); }));
    ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("dragover"); }));
    drop.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files) M.importFiles(e.dataTransfer.files); });

    App.on("project", M.renderBin);
  };

  M.typeOf = function (file) {
    if (file.type.startsWith("video")) return "video";
    if (file.type.startsWith("audio")) return "audio";
    if (file.type.startsWith("image")) return "image";
    const n = file.name.toLowerCase();
    if (/\.(mp4|webm|mov|mkv|avi|m4v)$/.test(n)) return "video";
    if (/\.(mp3|wav|aac|ogg|m4a|flac)$/.test(n)) return "audio";
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
    return null;
  };

  M.importFiles = function (files) {
    App.pushUndo();
    let added = 0;
    Array.from(files).forEach((file) => {
      const type = M.typeOf(file);
      if (!type) { App.status("Format tidak didukung: " + file.name); return; }
      const url = URL.createObjectURL(file);
      // relink: cocokkan berdasarkan nama dengan media yang sudah ada (mis. hasil Load proyek)
      const existing = App.project.media.find((m) => m.name === file.name && (!m.url || m.url.startsWith("blob:")));
      if (existing) {
        existing.url = url; existing.type = type; existing.thumb = "";
        App.mediaBlobs[existing.id] = file;
        M.probe(existing);
        App.status("Relink: " + file.name);
        return;
      }
      const media = {
        id: U.uid("m"), name: file.name, type, url,
        duration: 0, width: 0, height: 0, thumb: "", hasAudio: type === "video" || type === "audio",
      };
      App.project.media.push(media);
      App.mediaBlobs[media.id] = file;
      added++;
      M.probe(media);
    });
    if (added) { App.status(added + " media diimpor"); App.emit("media"); }
    App.project.name = App.project.name; // no-op
  };

  // Muat elemen & baca metadata (durasi, dimensi, thumbnail)
  M.probe = function (media) {
    if (media.type === "image") {
      const img = new Image();
      img.onload = () => {
        media.width = img.naturalWidth; media.height = img.naturalHeight;
        media.thumb = media.url;
        App.mediaEls[media.id] = img;
        App.emit("media"); App.emit("project");
      };
      img.src = media.url;
      return;
    }
    const el = document.createElement(media.type === "audio" ? "audio" : "video");
    el.src = media.url; el.preload = "auto"; el.muted = media.type === "video";
    el.crossOrigin = "anonymous";
    el.addEventListener("loadedmetadata", () => {
      media.duration = el.duration || 0;
      media.width = el.videoWidth || 0;
      media.height = el.videoHeight || 0;
      App.mediaEls[media.id] = el;
      M.grabThumb(media, el);
      App.emit("media"); App.emit("project");
    });
    el.addEventListener("error", () => { App.status("Gagal memuat: " + media.name); });
  };

  M.grabThumb = function (media, el) {
    if (media.type === "audio") { media.thumb = ""; return; }
    const grab = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 160; c.height = 90;
        const cx = c.getContext("2d");
        const vw = el.videoWidth, vh = el.videoHeight;
        if (!vw || !vh) return;
        const s = Math.max(160 / vw, 90 / vh);
        const w = vw * s, h = vh * s;
        cx.drawImage(el, (160 - w) / 2, (90 - h) / 2, w, h);
        media.thumb = c.toDataURL("image/jpeg", 0.7);
      } catch (e) {}
    };
    if (el.readyState >= 2) { el.currentTime = Math.min(0.1, (media.duration || 1) / 2); }
    const onSeek = () => { grab(); el.removeEventListener("seeked", onSeek); el.currentTime = 0; };
    el.addEventListener("seeked", onSeek);
    el.addEventListener("loadeddata", () => { if (el.currentTime === 0) { try { el.currentTime = Math.min(0.1, (media.duration || 1) / 2); } catch (e) {} } }, { once: true });
  };

  // Tambah item teks sebagai "media"
  M.addText = function (preset) {
    App.pushUndo();
    const media = {
      id: U.uid("m"), name: "Teks", type: "text", url: "",
      duration: 4, width: 0, height: 0, thumb: "", hasAudio: false, preset: preset || null,
    };
    App.project.media.push(media);
    App.emit("media");
    return media;
  };

  M.renderBin = function () {
    const grid = document.getElementById("mediaGrid");
    grid.innerHTML = "";
    document.querySelector(".drop-hint").style.display = App.project.media.length ? "none" : "block";
    App.project.media.forEach((media) => {
      const item = U.el("div", "media-item" + (App.selection.mediaId === media.id ? " sel" : ""));
      const icon = media.type === "audio" ? "🎵" : media.type === "image" ? "🖼️" : media.type === "text" ? "T" : "🎬";
      const thumb = U.el("div", "media-thumb");
      if (media.thumb) thumb.style.backgroundImage = "url(" + media.thumb + ")";
      else thumb.textContent = icon;
      if (media.duration) thumb.appendChild(U.el("span", "dur", U.formatDur(media.duration)));
      item.appendChild(thumb);
      item.appendChild(U.el("div", "media-name", media.name));
      item.title = media.name + "\nKlik 2x untuk tambah ke timeline";

      item.addEventListener("click", () => { App.selection.mediaId = media.id; M.renderBin(); });
      item.addEventListener("dblclick", () => Timeline.addMediaToPlayhead(media.id));
      item.draggable = true;
      item.addEventListener("dragstart", (e) => {
        App._dragPayload = { kind: "media", mediaId: media.id };
        e.dataTransfer.effectAllowed = "copy";
      });
      item.addEventListener("dragend", () => { App._dragPayload = null; });
      grid.appendChild(item);
    });
  };

  window.Media = M;
})();
