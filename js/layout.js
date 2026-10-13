/* PremiereCut — tata letak: panel/tab bisa digeser (perlebar / perkecil) */
(function () {
  "use strict";

  const L = {};
  const KEY = "pc_layout";
  const MIN_COL = 160, MIN_PANEL = 54, MIN_CENTER = 280;

  function save() {
    const s = { cols: {}, panels: {} };
    ["leftPanel", "rightPanel"].forEach((id) => { const e = document.getElementById(id); if (e) s.cols[id] = e.getBoundingClientRect().width; });
    U.$$(".panel-column .panel").forEach((p) => { if (p.id) s.panels[p.id] = p.getBoundingClientRect().height; });
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }

  function vSplit(leftEl, rightEl, sign) {
    const s = U.el("div", "v-split");
    s.title = "Geser untuk mengubah lebar";
    s.addEventListener("mousedown", (e) => {
      e.preventDefault();
      s.classList.add("drag");
      const startX = e.clientX;
      const lw = leftEl.getBoundingClientRect().width;
      const rw = rightEl.getBoundingClientRect().width;
      const move = (ev) => {
        const d = ev.clientX - startX;
        if (sign < 0) { // left panel fixed
          const nw = U.clamp(lw + d, MIN_COL, window.innerWidth - MIN_CENTER - MIN_COL);
          leftEl.style.width = nw + "px"; leftEl.style.flex = "0 0 " + nw + "px";
        } else { // right panel fixed
          const nw = U.clamp(rw - d, MIN_COL, window.innerWidth - MIN_CENTER - MIN_COL);
          rightEl.style.width = nw + "px"; rightEl.style.flex = "0 0 " + nw + "px";
        }
        onResize();
      };
      const up = () => { s.classList.remove("drag"); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); save(); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    });
    return s;
  }

  function hSplit(panelA, panelB) {
    const s = U.el("div", "h-split");
    s.title = "Geser untuk ubah tinggi";
    s.addEventListener("mousedown", (e) => {
      e.preventDefault();
      s.classList.add("drag");
      const startY = e.clientY;
      const ah = panelA.getBoundingClientRect().height;
      const bh = panelB.getBoundingClientRect().height;
      // bekukan kedua panel ke ukuran px saat ini
      panelA.style.flex = "0 0 " + ah + "px";
      panelB.style.flex = "0 0 " + bh + "px";
      const move = (ev) => {
        const d = ev.clientY - startY;
        const nah = Math.max(MIN_PANEL, ah + d);
        const nbh = Math.max(MIN_PANEL, bh - d);
        panelA.style.flex = "0 0 " + nah + "px";
        panelB.style.flex = "0 0 " + nbh + "px";
        onResize();
      };
      const up = () => { s.classList.remove("drag"); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); save(); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    });
    return s;
  }

  function onResize() {
    if (window.Timeline) { try { Timeline.render(); } catch (e) {} }
  }

  L.init = function () {
    const ws = document.getElementById("workspace");
    const left = document.getElementById("leftPanel");
    const center = document.getElementById("centerPanel");
    const right = document.getElementById("rightPanel");
    if (!ws || !left || !center || !right) return;

    // splitter vertikal antar kolom
    left.after(vSplit(left, center, -1));
    center.after(vSplit(center, right, +1));

    // splitter horizontal antar panel di setiap kolom
    [left, center, right].forEach((col) => {
      const panels = Array.prototype.slice.call(col.children).filter((c) => c.classList.contains("panel"));
      for (let i = 0; i < panels.length - 1; i++) panels[i].after(hSplit(panels[i], panels[i + 1]));
    });

    // pulihkan ukuran tersimpan
    const s = load();
    if (s) {
      if (s.cols && s.cols.leftPanel) { left.style.width = s.cols.leftPanel + "px"; left.style.flex = "0 0 " + s.cols.leftPanel + "px"; }
      if (s.cols && s.cols.rightPanel) { right.style.width = s.cols.rightPanel + "px"; right.style.flex = "0 0 " + s.cols.rightPanel + "px"; }
      if (s.panels) Object.keys(s.panels).forEach((id) => { const el = document.getElementById(id); if (el) el.style.flex = "0 0 " + s.panels[id] + "px"; });
    }

    window.addEventListener("resize", U.debounce(() => { if (window.Timeline) Timeline.render(); }, 150));
  };

  L.reset = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); };

  window.Layout = L;
})();
