/* PremiereCut — tata letak (workspace): panel bisa ditambah/dihapus/dipindah,
   splitter bisa digeser & snap ke posisi preset, plus workspace preset. */
(function () {
  "use strict";

  const L = {};
  const KEY = "pc_layout";
  const WSKEY = "pc_workspaces";
  const MIN_COL = 160, MIN_PANEL = 54, MIN_CENTER = 280, SNAP_T = 10;

  // katalog panel inti (singleton, sudah ada di DOM via data-panel)
  const CORE = [
    { id: "media", title: "Media Bin", def: "left", sel: "#projectPanel" },
    { id: "effects", title: "Effects & Filters", def: "left", sel: "#effectsPanel" },
    { id: "monitor", title: "Program Monitor", def: "center", sel: "#monitorPanel" },
    { id: "timeline", title: "Timeline", def: "center", sel: "#timelinePanel" },
    { id: "inspector", title: "Effect Controls", def: "right", sel: "#inspectorPanel" },
    { id: "color", title: "Lumetri Color", def: "right", sel: "#colorPanel" },
    { id: "audio", title: "Audio (Klip)", def: "right", sel: "#audioPanel" },
    { id: "mixer", title: "Audio Mixer", def: "right", sel: "#mixerPanel" },
  ];
  const UTIL = {
    notes: { title: "Notes", icon: "📝" },
    shortcuts: { title: "Shortcuts", icon: "⌨" },
  };
  const COLNAMES = { left: "Kiri", center: "Tengah", right: "Kanan" };

  const DEFAULT_LAYOUT = {
    columns: {
      left: ["media", "effects"],
      center: ["monitor", "timeline"],
      right: ["inspector", "color", "audio", "mixer"],
    },
    parked: [],
  };

  const BUILTINS = {
    "Editing": DEFAULT_LAYOUT,
    "Effects": { columns: { left: ["effects", "media"], center: ["monitor", "timeline"], right: ["inspector", "color", "audio", "mixer"] }, parked: [] },
    "Color": { columns: { left: ["media"], center: ["monitor", "timeline"], right: ["color", "inspector", "audio", "mixer"] }, parked: ["effects"] },
    "Audio": { columns: { left: ["effects"], center: ["monitor", "timeline"], right: ["mixer", "audio", "inspector", "color"] }, parked: ["media"] },
  };

  let dragNode = null;
  let _utilSeq = 0;

  // ---------- helper ----------
  function cols() {
    return {
      left: document.getElementById("leftPanel"),
      center: document.getElementById("centerPanel"),
      right: document.getElementById("rightPanel"),
    };
  }
  function park() { return document.getElementById("panelPark"); }
  function instOf(n) { return n.getAttribute("data-inst") || n.getAttribute("data-panel"); }
  function escq(s) { return String(s).replace(/"/g, '\\"'); }
  function nodeForInst(inst) {
    const sel = '.panel[data-inst="' + escq(inst) + '"]';
    return document.querySelector("#workspace " + sel) || document.querySelector("#panelPark " + sel);
  }
  function coreDef(id) { return CORE.find((c) => c.id === id); }
  function panelChildren(col) {
    return Array.prototype.slice.call(col.children).filter((c) => c.classList.contains("panel"));
  }

  // ---------- enhance panel (grip + tombol tutup) ----------
  function enhance(node) {
    if (node.dataset.enhanced) return node;
    if (!node.dataset.inst) node.dataset.inst = node.dataset.panel;
    const head = node.querySelector(".panel-head");
    if (!head) { node.dataset.enhanced = "1"; return node; }

    if (!head.querySelector(".panel-grip")) {
      const grip = U.el("span", "panel-grip", "⠿");
      grip.title = "Tahan & geser untuk memindah panel";
      grip.draggable = true;
      grip.addEventListener("dragstart", (e) => startDrag(e, node));
      grip.addEventListener("dragend", endDrag);
      head.insertBefore(grip, head.firstChild);
    }
    if (!head.querySelector(".panel-x")) {
      let tools = head.querySelector(".panel-tools");
      if (!tools) { tools = U.el("div", "panel-tools"); head.appendChild(tools); }
      const x = U.el("button", "panel-x", "✕");
      x.type = "button"; x.title = "Tutup panel";
      x.addEventListener("click", () => L.park(node.dataset.inst));
      tools.appendChild(x);
    }
    node.dataset.enhanced = "1";
    return node;
  }

  // ---------- drag & drop antar kolom ----------
  function startDrag(e, node) {
    dragNode = node;
    node.classList.add("dragging");
    try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", node.dataset.inst); } catch (err) {}
  }
  function endDrag() {
    if (dragNode) dragNode.classList.remove("dragging");
    dragNode = null;
    U.$$(".drag-over").forEach((n) => n.classList.remove("drag-over"));
  }
  function computeBefore(col, clientY) {
    const panels = panelChildren(col);
    for (const p of panels) {
      const r = p.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return p;
    }
    return null; // paling bawah
  }
  function wireDrop(col) {
    col.addEventListener("dragover", (e) => {
      if (!dragNode) return;
      e.preventDefault();
      col.classList.add("drag-over");
      const before = computeBefore(col, e.clientY);
      U.$$(".drag-over", col).forEach((n) => { if (n !== col) n.classList.remove("drag-over"); });
      if (before) before.classList.add("drag-over");
    });
    col.addEventListener("dragleave", (e) => {
      if (e.target === col) col.classList.remove("drag-over");
    });
    col.addEventListener("drop", (e) => {
      if (!dragNode) { col.classList.remove("drag-over"); return; }
      e.preventDefault();
      const before = computeBefore(col, e.clientY);
      const bar = col.querySelector(":scope > .col-add");
      const node = dragNode;
      if (before) col.insertBefore(node, before);
      else if (bar) col.insertBefore(node, bar);
      else col.appendChild(node);
      endDrag();
      relayoutSplitters();
      onResize();
      L.save();
      App.status("Panel dipindah ke kolom " + (COLNAMES[col.dataset.col] || "") + ".");
    });
  }

  // ---------- splitter (geser + snap) ----------
  function snapOn() { return !App.settings || App.settings.layoutSnap !== false; }
  function snapPoints() {
    const p = App.settings && App.settings.snapPoints;
    return (Array.isArray(p) && p.length) ? p : [0.25, 1 / 3, 0.5, 2 / 3, 0.75];
  }
  function snapped(value, total) {
    let best = value, found = false, bd = SNAP_T + 1;
    snapPoints().forEach((f) => {
      const t = f * total, d = Math.abs(value - t);
      if (d < bd) { bd = d; best = t; found = true; }
    });
    return found ? best : value;
  }
  function guide(orient, pos) {
    const g = document.getElementById("snapGuide");
    if (!g) return;
    g.classList.remove("hidden");
    if (orient === "v") { g.classList.add("v"); g.classList.remove("h"); g.style.left = Math.round(pos) + "px"; g.style.top = ""; }
    else { g.classList.add("h"); g.classList.remove("v"); g.style.top = Math.round(pos) + "px"; g.style.left = ""; }
  }
  function hideGuide() { const g = document.getElementById("snapGuide"); if (g) g.classList.add("hidden"); }

  function vSplit(leftEl, rightEl, sign) {
    const s = U.el("div", "v-split");
    s.title = "Geser untuk mengubah lebar" + (snapOn() ? " (snap ke preset)" : "");
    s.addEventListener("mousedown", (e) => {
      e.preventDefault();
      s.classList.add("drag");
      const startX = e.clientX;
      const lw = leftEl.getBoundingClientRect().width;
      const rw = rightEl.getBoundingClientRect().width;
      const wsW = document.getElementById("workspace").getBoundingClientRect().width;
      const move = (ev) => {
        const d = ev.clientX - startX;
        if (sign < 0) {
          let nw = U.clamp(lw + d, MIN_COL, window.innerWidth - MIN_CENTER - MIN_COL);
          if (snapOn()) { const sn = snapped(nw, wsW); if (sn !== nw) { nw = sn; guide("v", leftEl.getBoundingClientRect().left + nw); } else hideGuide(); }
          else hideGuide();
          leftEl.style.width = nw + "px"; leftEl.style.flex = "0 0 " + nw + "px";
        } else {
          let nw = U.clamp(rw - d, MIN_COL, window.innerWidth - MIN_CENTER - MIN_COL);
          if (snapOn()) { const sn = snapped(nw, wsW); if (sn !== nw) { nw = sn; guide("v", rightEl.getBoundingClientRect().right - nw); } else hideGuide(); }
          else hideGuide();
          rightEl.style.width = nw + "px"; rightEl.style.flex = "0 0 " + nw + "px";
        }
        onResize();
      };
      const up = () => { s.classList.remove("drag"); hideGuide(); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); L.save(); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    });
    return s;
  }

  function hSplit(panelA, panelB) {
    const s = U.el("div", "h-split");
    s.title = "Geser untuk ubah tinggi" + (snapOn() ? " (snap ke preset)" : "");
    s.addEventListener("mousedown", (e) => {
      e.preventDefault();
      s.classList.add("drag");
      const startY = e.clientY;
      const ah = panelA.getBoundingClientRect().height;
      const bh = panelB.getBoundingClientRect().height;
      const colH = ah + bh;
      panelA.style.flex = "0 0 " + ah + "px";
      panelB.style.flex = "0 0 " + bh + "px";
      const move = (ev) => {
        const d = ev.clientY - startY;
        let nah = Math.max(MIN_PANEL, ah + d);
        let nbh = Math.max(MIN_PANEL, bh - d);
        if (snapOn()) { const sn = snapped(nah, colH); if (sn !== nah) { nah = sn; nbh = colH - sn; guide("h", panelA.getBoundingClientRect().top + nah); } else hideGuide(); }
        else hideGuide();
        panelA.style.flex = "0 0 " + nah + "px";
        panelB.style.flex = "0 0 " + nbh + "px";
        onResize();
      };
      const up = () => { s.classList.remove("drag"); hideGuide(); document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); L.save(); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
    });
    return s;
  }

  function relayoutSplitters() {
    const ws = document.getElementById("workspace");
    const c = cols();
    if (!ws || !c.left || !c.center || !c.right) return;
    U.$$("#workspace > .v-split, #workspace .h-split").forEach((n) => n.remove());
    c.left.after(vSplit(c.left, c.center, -1));
    c.center.after(vSplit(c.center, c.right, +1));
    ["left", "center", "right"].forEach((k) => {
      const panels = panelChildren(c[k]);
      for (let i = 0; i < panels.length - 1; i++) panels[i].after(hSplit(panels[i], panels[i + 1]));
    });
  }

  function onResize() {
    if (window.Timeline) { try { Timeline.render(); } catch (e) {} }
  }

  // ---------- buat panel utilitas ----------
  function buildUtil(id, inst) {
    const def = UTIL[id];
    const panel = U.el("section", "panel");
    panel.setAttribute("data-panel", id);
    panel.setAttribute("data-inst", inst);
    const head = U.el("div", "panel-head");
    head.appendChild(U.el("span", "panel-title", def.icon + " " + def.title));
    head.appendChild(U.el("div", "panel-tools"));
    panel.appendChild(head);
    const body = U.el("div", "panel-body");
    if (id === "notes") {
      const b = U.el("div", "notes-body");
      b.contentEditable = "true"; b.spellcheck = false;
      if (L._notes && L._notes[inst]) b.innerHTML = L._notes[inst];
      b.addEventListener("input", U.debounce(() => {
        L._notes[inst] = b.innerHTML;
        L.save();
      }, 400));
      body.appendChild(b);
    } else if (id === "shortcuts") {
      body.appendChild(buildShortcuts());
    }
    panel.appendChild(body);
    return panel;
  }
  function buildShortcuts() {
    const rows = [
      ["Space", "Play / Pause"], ["S", "Split di playhead"], ["Del", "Hapus klip"],
      ["← / →", "Frame mundur / maju"], ["Ctrl+K", "Cari fitur (palette)"],
      ["Ctrl+S", "Simpan proyek"], ["Ctrl+E", "Export video"], ["Ctrl+,", "Pengaturan"],
      ["Drag ⠿", "Pindah panel antar kolom"], ["✕", "Tutup panel"],
    ];
    const box = U.el("div", "sc-list");
    rows.forEach((r) => { box.appendChild(U.el("div", "<kbd>" + r[0] + "</kbd> — " + r[1])); });
    return box;
  }

  // ---------- ambil/ciptakan node ----------
  function take(inst) {
    let n = nodeForInst(inst);
    if (n) return enhance(n);
    const id = String(inst).split(":")[0];
    if (UTIL[id]) { n = enhance(buildUtil(id, inst)); return n; }
    const cd = coreDef(id);
    if (cd) { const el = document.querySelector(cd.sel); if (el) { if (!el.dataset.inst) el.dataset.inst = id; return enhance(el); } }
    return null;
  }

  // ---------- terapkan layout ----------
  L.applyLayout = function (layout, opts) {
    if (!layout) layout = DEFAULT_LAYOUT;
    opts = opts || {};
    const c = cols(), p = park();
    if (!c.left || !p) return;
    // tarik semua panel ke park dulu
    U.$$("#workspace .panel").forEach((n) => p.appendChild(n));

    const colMap = { left: [], center: [], right: [] };
    const src = layout.columns || {};
    ["left", "center", "right"].forEach((k) => { if (Array.isArray(src[k])) colMap[k] = src[k].slice(); });
    const parkedList = Array.isArray(layout.parked) ? layout.parked.slice() : [];

    const inAny = new Set([].concat(colMap.left, colMap.center, colMap.right, parkedList));
    CORE.forEach((cd) => { if (!inAny.has(cd.id)) { colMap[cd.def].push(cd.id); inAny.add(cd.id); } });

    ["left", "center", "right"].forEach((k) => {
      const col = c[k], bar = col.querySelector(":scope > .col-add");
      colMap[k].forEach((inst) => {
        const n = take(inst);
        if (!n) return;
        const x = n.querySelector(".panel-x");
        if (bar) col.insertBefore(n, bar); else col.appendChild(n);
        void x;
      });
    });
    parkedList.forEach((inst) => { const n = take(inst); if (n) p.appendChild(n); });

    // panel inti yang tak disebut & tak di park -> pastikan tetap terlihat
    relayoutSplitters();
    if (layout.sizes) applySizes(layout.sizes);
    onResize();
    if (!opts.silent) L.save();
  };

  function applySizes(sizes) {
    const c = cols();
    if (typeof sizes.leftPanel === "number" && c.left) { c.left.style.width = sizes.leftPanel + "px"; c.left.style.flex = "0 0 " + sizes.leftPanel + "px"; }
    if (typeof sizes.rightPanel === "number" && c.right) { c.right.style.width = sizes.rightPanel + "px"; c.right.style.flex = "0 0 " + sizes.rightPanel + "px"; }
    if (sizes.panels) Object.keys(sizes.panels).forEach((inst) => { const n = nodeForInst(inst); if (n) n.style.flex = "0 0 " + sizes.panels[inst] + "px"; });
  }

  // ---------- simpan / muat tata letak ----------
  L.save = U.debounce(function () {
    const c = cols();
    if (!c.left) return;
    const s = { v: 2, columns: { left: [], center: [], right: [] }, parked: [], sizes: {}, notes: {} };
    ["left", "center", "right"].forEach((k) => { panelChildren(c[k]).forEach((n) => s.columns[k].push(instOf(n))); });
    U.$$("#panelPark > .panel").forEach((n) => s.parked.push(instOf(n)));
    s.sizes.leftPanel = c.left.getBoundingClientRect().width;
    s.sizes.rightPanel = c.right.getBoundingClientRect().width;
    s.sizes.panels = {};
    U.$$("#workspace .panel").forEach((n) => { s.sizes.panels[instOf(n)] = Math.round(n.getBoundingClientRect().height); });
    U.$$('#workspace .panel[data-panel="notes"], #panelPark .panel[data-panel="notes"]').forEach((n) => {
      const b = n.querySelector(".notes-body"); if (b) s.notes[instOf(n)] = b.innerHTML;
    });
    L._notes = s.notes;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }, 250);

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { return null; } }

  // ---------- tambah / park / fokus panel ----------
  L.park = function (inst) {
    const n = nodeForInst(inst);
    if (!n) return;
    park().appendChild(n);
    relayoutSplitters(); onResize(); L.save();
    App.status("Panel ditutup. Buka lagi dari menu Layout ▸ Tambah Panel.");
  };

  L.addPanel = function (id, colKey) {
    colKey = colKey || (coreDef(id) ? coreDef(id).def : "right");
    const c = cols(); const col = c[colKey]; if (!col) return;
    let inst = id;
    if (UTIL[id]) { inst = id + ":" + (++_utilSeq) + "_" + Date.now().toString(36).slice(-3); }
    const n = take(inst);
    if (!n) return;
    const bar = col.querySelector(":scope > .col-add");
    if (bar) col.insertBefore(n, bar); else col.appendChild(n);
    relayoutSplitters(); onResize(); L.save();
    L.flash(n);
    App.status("Panel \"" + (UTIL[id] ? UTIL[id].title : (coreDef(id) ? coreDef(id).title : id)) + "\" ditambah ke kolom " + (COLNAMES[colKey] || "") + ".");
  };

  L.flash = function (n) {
    n.classList.remove("flash"); void n.offsetWidth; n.classList.add("flash");
  };

  L.focusPanel = function (id) {
    const n = nodeForInst(id);
    if (!n || n.closest("#panelPark")) { L.addPanel(id); return; }
    L.flash(n);
  };

  function isPlaced(inst) { const n = nodeForInst(inst); return n && !n.closest("#panelPark"); }

  // ---------- workspace preset ----------
  function loadWorkspaces() { try { return JSON.parse(localStorage.getItem(WSKEY) || "{}"); } catch (e) { return {}; } }
  function saveWorkspaces(o) { try { localStorage.setItem(WSKEY, JSON.stringify(o)); } catch (e) {} }

  L.presets = function () {
    const user = loadWorkspaces();
    return { builtins: BUILTINS, user: user };
  };

  L.saveWorkspace = function (name) {
    name = (name || "").trim();
    if (!name) return;
    const c = cols();
    const layout = { columns: { left: [], center: [], right: [] }, parked: [], sizes: {} };
    ["left", "center", "right"].forEach((k) => panelChildren(c[k]).forEach((n) => layout.columns[k].push(instOf(n))));
    U.$$("#panelPark > .panel").forEach((n) => layout.parked.push(instOf(n)));
    layout.sizes.leftPanel = Math.round(c.left.getBoundingClientRect().width);
    layout.sizes.rightPanel = Math.round(c.right.getBoundingClientRect().width);
    layout.sizes.panels = {};
    U.$$("#workspace .panel").forEach((n) => { layout.sizes.panels[instOf(n)] = Math.round(n.getBoundingClientRect().height); });
    const u = loadWorkspaces(); u[name] = layout; saveWorkspaces(u);
    App.status("Layout \"" + name + "\" disimpan.");
  };

  L.applyWorkspace = function (name) {
    const b = BUILTINS[name];
    if (b) { L.applyLayout(b); App.status("Workspace: " + name); return; }
    const u = loadWorkspaces();
    if (u[name]) { L.applyLayout(u[name]); App.status("Workspace: " + name); }
  };

  L.removeWorkspace = function (name) {
    const u = loadWorkspaces(); delete u[name]; saveWorkspaces(u);
    App.status("Layout \"" + name + "\" dihapus.");
  };

  L.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    L.applyLayout(DEFAULT_LAYOUT);
    App.status("Tata letak panel direset.");
  };

  // ---------- menu Layout ----------
  function positionMenu(m, x, y) {
    m.classList.remove("hidden");
    const r = m.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight;
    if (x + r.width > vw - 6) x = vw - r.width - 6;
    if (y + r.height > vh - 6) y = Math.max(6, vh - r.height - 6);
    m.style.left = Math.max(6, x) + "px";
    m.style.top = Math.max(6, y) + "px";
  }
  function mi(label, fn, opts) {
    opts = opts || {};
    const row = U.el("div", "mi" + (opts.checked ? " checked" : "") + (opts.active ? " active" : ""));
    row.appendChild(U.el("span", null, label));
    if (opts.hint) row.appendChild(U.el("span", "sc", opts.hint));
    if (opts.onDelete) {
      const x = U.el("span", "lm-x", "✕");
      x.title = "Hapus layout";
      x.addEventListener("click", (e) => { e.stopPropagation(); opts.onDelete(); L.openMenu(); });
      row.appendChild(x);
      row.style.cursor = "default";
      row.querySelector("span").style.cursor = "pointer";
      row.querySelector("span").addEventListener("click", fn);
    } else {
      row.addEventListener("click", fn);
    }
    return row;
  }
  function head(t) { return U.el("div", "lm-head", t); }
  function div() { return U.el("div", "mdiv"); }

  L.openMenu = function () {
    const m = document.getElementById("layoutMenu");
    const btn = document.getElementById("btnLayout");
    if (!m) return;
    if (!m.classList.contains("hidden")) { L.closeMenus(); return; }
    L.closeMenus();
    m.innerHTML = "";
    m.classList.add("layout-menu");

    m.appendChild(head("Workspace"));
    Object.keys(BUILTINS).forEach((name) => m.appendChild(mi(name, () => { L.closeMenus(); L.applyWorkspace(name); })));
    const ws = loadWorkspaces();
    Object.keys(ws).forEach((name) => m.appendChild(mi(name, () => { L.closeMenus(); L.applyWorkspace(name); }, { onDelete: () => L.removeWorkspace(name) })));
    m.appendChild(mi("💾 Simpan Layout Saat Ini…", () => {
      L.closeMenus();
      const name = prompt("Nama layout baru:", "Layout " + (Object.keys(ws).length + 1));
      if (name) { L.saveWorkspace(name); L.openMenu(); }
    }));

    m.appendChild(div());
    m.appendChild(head("Tambah Panel"));
    Object.keys(UTIL).forEach((id) => m.appendChild(mi("＋ " + UTIL[id].icon + " " + UTIL[id].title, () => { L.closeMenus(); L.addPanel(id, "right"); })));
    CORE.forEach((cd) => { if (!isPlaced(cd.id)) m.appendChild(mi("＋ " + cd.title, () => { L.closeMenus(); L.addPanel(cd.id); })); });

    m.appendChild(div());
    m.appendChild(mi("Snap ke Posisi Preset", () => { L.toggleSnap(); L.openMenu(); }, { checked: snapOn() }));
    m.appendChild(mi("⚙ Atur Titik Snap…", () => { L.closeMenus(); Settings.open(); }));
    m.appendChild(div());
    m.appendChild(mi("↺ Reset Tata Letak", () => { L.closeMenus(); L.reset(); }));

    const r = btn.getBoundingClientRect();
    positionMenu(m, r.right - m.getBoundingClientRect().width, r.bottom + 2);
    // pastikan menempel kanan tombol setelah diukur
    positionMenu(m, btn.getBoundingClientRect().right - m.getBoundingClientRect().width, r.bottom + 2);
  };

  L.toggleSnap = function () {
    App.settings.layoutSnap = !snapOn();
    App.status("Snap splitter: " + (App.settings.layoutSnap ? "ON" : "OFF"));
  };

  // ---------- picker per kolom ----------
  L.openPicker = function (colKey, anchor) {
    const m = document.getElementById("panelPicker");
    if (!m) return;
    if (!m.classList.contains("hidden") && m.dataset.col === colKey) { L.closeMenus(); return; }
    L.closeMenus();
    m.innerHTML = "";
    m.dataset.col = colKey;
    m.appendChild(head("Tambah ke kolom " + (COLNAMES[colKey] || "")));
    Object.keys(UTIL).forEach((id) => m.appendChild(mi("＋ " + UTIL[id].icon + " " + UTIL[id].title, () => { L.closeMenus(); L.addPanel(id, colKey); })));
    CORE.forEach((cd) => {
      const placed = isPlaced(cd.id);
      m.appendChild(mi((placed ? "↦ " : "＋ ") + cd.title, () => { L.closeMenus(); L.addPanel(cd.id, colKey); }, placed ? { hint: "pindah" } : {}));
    });
    m.appendChild(div());
    m.appendChild(mi("📄 Simpan sebagai layout…", () => { L.closeMenus(); const name = prompt("Nama layout:"); if (name) L.saveWorkspace(name); }));
    const r = anchor.getBoundingClientRect();
    positionMenu(m, r.left, r.top - m.getBoundingClientRect().height - 2);
    positionMenu(m, r.left, anchor.getBoundingClientRect().top - m.getBoundingClientRect().height - 2);
  };

  L.closeMenus = function () {
    ["layoutMenu", "panelPicker"].forEach((id) => { const m = document.getElementById(id); if (m) m.classList.add("hidden"); });
    const mt = document.getElementById("mainMenuDropdown");
    void mt;
  };

  // ---------- init ----------
  L.init = function () {
    const ws = document.getElementById("workspace");
    const c = cols();
    if (!ws || !c.left || !c.center || !c.right) return;

    c.left.dataset.col = "left"; c.center.dataset.col = "center"; c.right.dataset.col = "right";

    // add-bar tiap kolom
    ["left", "center", "right"].forEach((k) => {
      const col = c[k];
      if (!col.querySelector(":scope > .col-add")) {
        const bar = U.el("div", "col-add");
        const b = U.el("button", null, "＋ Tambah Panel");
        b.type = "button";
        b.addEventListener("click", (e) => { e.stopPropagation(); L.openPicker(k, e.currentTarget); });
        bar.appendChild(b);
        col.appendChild(bar);
      }
      wireDrop(col);
    });

    // enhance panel yang ada
    U.$$("#workspace .panel").forEach(enhance);

    // pulihkan layout tersimpan
    const saved = load();
    if (saved && saved.columns) {
      L._notes = saved.notes || {};
      L.applyLayout(saved, { silent: true });
    } else {
      relayoutSplitters();
    }

    // tombol menu Layout
    const btn = document.getElementById("btnLayout");
    if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); L.openMenu(); });

    // tutup menu saat klik di luar
    document.addEventListener("click", (e) => {
      const inMenu = e.target.closest("#layoutMenu") || e.target.closest("#panelPicker");
      if (!inMenu && !e.target.closest("#btnLayout") && !e.target.closest(".col-add")) L.closeMenus();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") L.closeMenus(); });

    window.addEventListener("resize", U.debounce(() => { onResize(); }, 150));
  };

  // ---------- statistik (untuk self-test) ----------
  L.stats = function () {
    return {
      panels: document.querySelectorAll("#workspace .panel").length,
      parked: document.querySelectorAll("#panelPark .panel").length,
      splitters: document.querySelectorAll(".v-split,.h-split").length,
      adds: document.querySelectorAll(".col-add").length,
      snapPoints: snapPoints().length,
    };
  };

  window.Layout = L;
})();
