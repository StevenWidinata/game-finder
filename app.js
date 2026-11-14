(() => {
  "use strict";

  const STORAGE_KEY = "gamefinder.v1";
  const TIERS = ["S", "A", "B", "C", "D"];
  const TIER_LABELS = { S: "Best ever", A: "Great", B: "Good", C: "Okay", D: "Meh" };
  const STARTER = (window.STARTER_GAMES || []).map(g => ({ ...g, starter: true }));

  // ---------- Saved state (this browser only) ----------
  // custom:    games the user added
  // overrides: edits the user made to starter games, by id
  // tiers:     { gameId: "S" | "A" | ... }
  // hidden:    starter game ids the user removed
  const emptyState = () => ({ custom: [], overrides: {}, tiers: {}, hidden: [] });

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      return normalizeState(JSON.parse(raw));
    } catch {
      return emptyState();
    }
  }
  function normalizeState(s) {
    const base = emptyState();
    if (!s || typeof s !== "object") return base;
    if (Array.isArray(s.custom)) base.custom = s.custom.filter(g => g && g.id && g.name && g.url);
    if (s.overrides && typeof s.overrides === "object") base.overrides = s.overrides;
    if (s.tiers && typeof s.tiers === "object") {
      for (const [k, v] of Object.entries(s.tiers)) if (TIERS.includes(v)) base.tiers[k] = v;
    }
    if (Array.isArray(s.hidden)) base.hidden = s.hidden.filter(x => typeof x === "string");
    return base;
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { toast("Couldn't save — your browser may be blocking storage."); }
  }

  let state = loadState();

  function allGames() {
    const hidden = new Set(state.hidden);
    const starters = STARTER
      .filter(g => !hidden.has(g.id))
      .map(g => ({ ...g, ...(state.overrides[g.id] || {}) }));
    return [...starters, ...state.custom.map(g => ({ ...g, starter: false }))]
      .map(g => ({ ...g, tier: state.tiers[g.id] || null }));
  }
  const findGame = id => allGames().find(g => g.id === id);

  // ---------- UI state ----------
  const ui = {
    query: "",
    category: "All",
    tier: "all",      // "all" | "S".."D" | "none"
    sort: localGet("gamefinder.sort") || "tier",
  };
  function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function localSet(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }

  // ---------- Elements ----------
  const $ = sel => document.querySelector(sel);
  const el = {
    search: $("#search"), categories: $("#categories"), tierFilter: $("#tierFilter"),
    sort: $("#sort"), grid: $("#grid"), count: $("#count"),
    empty: $("#empty"), emptyQuery: $("#emptyQuery"), emptyAdd: $("#emptyAdd"),
    addBtn: $("#addBtn"),
    gameDialog: $("#gameDialog"), gameForm: $("#gameForm"), gameDialogTitle: $("#gameDialogTitle"),
    formTiers: $("#formTiers"), categoryList: $("#categoryList"),
    tierDialog: $("#tierDialog"), tierGameName: $("#tierGameName"), tierOptions: $("#tierOptions"),
    confirmDialog: $("#confirmDialog"), confirmText: $("#confirmText"), confirmOk: $("#confirmOk"),
    exportBtn: $("#exportBtn"), importInput: $("#importInput"), resetBtn: $("#resetBtn"),
    toast: $("#toast"),
  };

  // ---------- Helpers ----------
  const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
  }
  function fixUrl(u) {
    u = (u || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    try { const parsed = new URL(u); return /^https?:$/.test(parsed.protocol) ? parsed.href : ""; }
    catch { return ""; }
  }
  function slug(name) {
    const base = norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "game";
    const taken = new Set([...STARTER.map(g => g.id), ...state.custom.map(g => g.id)]);
    let id = base, n = 2;
    while (taken.has(id)) id = `${base}-${n++}`;
    return id;
  }
  function h(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "style") node.style.cssText = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) if (c != null) node.append(c);
    return node;
  }
  const tierColor = t => (t ? `var(--tier-${t})` : "");

  // ---------- Search ----------
  function matches(g, words) {
    if (!words.length) return true;
    const hay = norm([g.name, g.description, g.category, hostOf(g.url), ...(g.tags || [])].join(" "));
    const compactName = norm(g.name).replace(/[^a-z0-9]/g, "");
    return words.every(w => hay.includes(w) || compactName.includes(w.replace(/[^a-z0-9]/g, "")) && w.length > 2);
  }

  // ---------- Render ----------
  function render() {
    const games = allGames();
    const words = norm(ui.query).split(/\s+/).filter(Boolean);

    // Categories (counts reflect current search)
    const searched = games.filter(g => matches(g, words));
    const cats = [...new Set(games.map(g => g.category || "Other"))].sort((a, b) => a.localeCompare(b));
    if (ui.category !== "All" && !cats.includes(ui.category)) ui.category = "All";
    el.categories.replaceChildren(
      ...["All", ...cats].map(c => {
        const n = c === "All" ? searched.length : searched.filter(g => (g.category || "Other") === c).length;
        return h("button", {
          class: "chip", type: "button", "aria-pressed": String(ui.category === c),
          onclick: () => { ui.category = c; render(); },
        }, c, h("span", { class: "n" }, String(n)));
      })
    );
    el.categoryList.replaceChildren(...cats.map(c => h("option", { value: c })));

    // Tier filter buttons
    el.tierFilter.replaceChildren(
      h("button", { type: "button", class: "all", "aria-pressed": String(ui.tier === "all"), onclick: () => setTierFilter("all") }, "All tiers"),
      ...TIERS.map(t => h("button", {
        type: "button", "data-tier": t, style: `--tc:${tierColor(t)}`,
        title: `${t} — ${TIER_LABELS[t]}`, "aria-pressed": String(ui.tier === t),
        onclick: () => setTierFilter(ui.tier === t ? "all" : t),
      }, t)),
      h("button", { type: "button", class: "all", "data-tier": "none", "aria-pressed": String(ui.tier === "none"),
        title: "Games you haven't rated yet", onclick: () => setTierFilter(ui.tier === "none" ? "all" : "none") }, "Unrated"),
    );

    // Filter + sort
    let list = searched
      .filter(g => ui.category === "All" || (g.category || "Other") === ui.category)
      .filter(g => ui.tier === "all" || (ui.tier === "none" ? !g.tier : g.tier === ui.tier));

    const tierRank = t => (t ? TIERS.indexOf(t) : TIERS.length);
    const byName = (a, b) => a.name.localeCompare(b.name);
    if (ui.sort === "name") list.sort(byName);
    else if (ui.sort === "category") list.sort((a, b) => (a.category || "").localeCompare(b.category || "") || byName(a, b));
    else list.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || byName(a, b));

    el.grid.replaceChildren(...list.map(card));
    el.count.textContent = `${list.length} game${list.length === 1 ? "" : "s"}`;
    el.empty.hidden = list.length > 0;
    el.emptyQuery.textContent = ui.query || (ui.tier !== "all" ? "this tier" : "this filter");
    el.emptyAdd.hidden = !ui.query;
  }

  function setTierFilter(t) { ui.tier = t; render(); }

  function card(g) {
    const host = hostOf(g.url);
    const letter = (g.name.trim()[0] || "?").toUpperCase();
    const icon = h("div", { class: "card-icon", "aria-hidden": "true" });
    const img = h("img", {
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`,
      alt: "", loading: "lazy", width: "28", height: "28",
    });
    img.addEventListener("error", () => { icon.textContent = letter; });
    icon.append(img);

    const badge = h("button", {
      class: "tier-badge" + (g.tier ? "" : " none"), type: "button",
      style: g.tier ? `--tc:${tierColor(g.tier)}` : null,
      title: g.tier ? `Fun tier ${g.tier} — tap to change` : "Tap to rate how fun it is",
      "aria-label": g.tier ? `Fun tier ${g.tier}, change` : `Rate ${g.name}`,
      onclick: () => openTierPicker(g.id),
    }, g.tier || "Rate");

    return h("article", { class: "card" },
      icon,
      h("div", { class: "card-body" },
        h("a", { class: "card-name", href: g.url, target: "_blank", rel: "noopener noreferrer" }, g.name),
        g.description ? h("p", { class: "card-desc" }, g.description) : null,
        h("div", { class: "card-meta" },
          h("span", { class: "tag" }, g.category || "Other"),
          h("span", { class: "host" }, host),
        ),
      ),
      h("div", { class: "card-side" },
        badge,
        h("div", { class: "mini-btns" },
          h("button", { class: "icon-btn", type: "button", title: "Edit", "aria-label": `Edit ${g.name}`, onclick: () => openGameForm(g.id) }, "✎"),
          h("button", { class: "icon-btn", type: "button", title: "Remove", "aria-label": `Remove ${g.name}`, onclick: () => removeGame(g.id) }, "🗑"),
        ),
      ),
    );
  }

  // ---------- Tier picker ----------
  let tierTarget = null;
  function tierButtons(container, current, onPick) {
    container.replaceChildren(
      ...TIERS.map(t => h("button", {
        type: "button", class: "tier-choice", style: `--tc:${tierColor(t)}`,
        "aria-pressed": String(current === t), title: TIER_LABELS[t],
        onclick: () => onPick(t),
      }, t)),
      h("button", { type: "button", class: "tier-choice none", "aria-pressed": String(!current), onclick: () => onPick(null) }, "None"),
    );
  }
  function openTierPicker(id) {
    const g = findGame(id);
    if (!g) return;
    tierTarget = id;
    el.tierGameName.textContent = g.name;
    tierButtons(el.tierOptions, g.tier, t => {
      setTier(tierTarget, t);
      el.tierDialog.close();
    });
    if (!el.tierDialog.querySelector(".tier-legend")) {
      el.tierOptions.after(h("p", { class: "tier-legend" }, TIERS.map(t => `${t} = ${TIER_LABELS[t]}`).join(" · ")));
    }
    el.tierDialog.showModal();
  }
  function setTier(id, t) {
    if (t) state.tiers[id] = t; else delete state.tiers[id];
    saveState();
    render();
  }

  // ---------- Add / edit ----------
  let editingId = null;
  let formTier = null;
  function openGameForm(id = null, prefillName = "") {
    editingId = id;
    const g = id ? findGame(id) : null;
    const f = el.gameForm.elements;
    el.gameDialogTitle.textContent = g ? `Edit ${g.name}` : "Add a game";
    f.name.value = g ? g.name : prefillName;
    f.url.value = g ? g.url : "";
    f.category.value = g ? (g.category || "") : (ui.category !== "All" ? ui.category : "");
    f.description.value = g ? (g.description || "") : "";
    formTier = g ? g.tier : null;
    const drawTiers = () => tierButtons(el.formTiers, formTier, t => { formTier = t; drawTiers(); });
    drawTiers();
    el.gameDialog.showModal();
    setTimeout(() => (g ? f.name : (prefillName ? f.url : f.name)).focus(), 50);
  }

  el.gameForm.addEventListener("submit", e => {
    e.preventDefault();
    const f = el.gameForm.elements;
    const name = f.name.value.trim();
    const url = fixUrl(f.url.value);
    if (!name) { f.name.focus(); return; }
    if (!url) { f.url.setCustomValidity("Please enter a valid link, like wordle.com"); f.url.reportValidity(); return; }
    const data = {
      name, url,
      category: f.category.value.trim() || "Other",
      description: f.description.value.trim(),
    };

    let id = editingId;
    if (!id) {
      id = slug(name);
      state.custom.push({ id, ...data, tags: [] });
      toast(`Added ${name}`);
    } else if (STARTER.some(g => g.id === id)) {
      state.overrides[id] = data;
      toast(`Saved ${name}`);
    } else {
      const i = state.custom.findIndex(g => g.id === id);
      if (i >= 0) state.custom[i] = { ...state.custom[i], ...data };
      toast(`Saved ${name}`);
    }
    if (formTier) state.tiers[id] = formTier; else delete state.tiers[id];
    saveState();
    el.gameDialog.close();
    render();
  });
  el.gameForm.elements.url.addEventListener("input", e => e.target.setCustomValidity(""));

  // ---------- Remove (with undo) ----------
  function removeGame(id) {
    const g = findGame(id);
    if (!g) return;
    const before = JSON.stringify(state);
    if (g.starter) state.hidden.push(id);
    else state.custom = state.custom.filter(x => x.id !== id);
    saveState();
    render();
    toast(`Removed ${g.name}`, "Undo", () => {
      state = normalizeState(JSON.parse(before));
      saveState();
      render();
    });
  }

  // ---------- Confirm ----------
  function confirmBox(text, okLabel, onOk) {
    el.confirmText.textContent = text;
    el.confirmOk.textContent = okLabel;
    el.confirmOk.onclick = () => { el.confirmDialog.close(); onOk(); };
    el.confirmDialog.showModal();
  }

  // ---------- Export / Import / Reset ----------
  el.exportBtn.addEventListener("click", () => {
    const payload = { app: "game-finder", version: 1, exportedAt: new Date().toISOString(), ...state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `game-finder-${new Date().toISOString().slice(0, 10)}.json` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast("Exported your games");
  });

  el.importInput.addEventListener("change", async () => {
    const file = el.importInput.files[0];
    el.importInput.value = "";
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || (data.app && data.app !== "game-finder")) throw new Error("wrong file");
      const incoming = normalizeState(data);
      confirmBox("Replace your current games and tiers with this file?", "Import", () => {
        state = incoming;
        saveState();
        render();
        toast("Imported!");
      });
    } catch {
      toast("That file doesn't look like a Game Finder export.");
    }
  });
  // Let keyboard users open the import picker
  el.importInput.parentElement.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.importInput.click(); }
  });

  el.resetBtn.addEventListener("click", () => {
    confirmBox("Reset everything? Your added games, edits and tiers will be cleared.", "Reset", () => {
      state = emptyState();
      saveState();
      render();
      toast("Back to the starter list");
    });
  });

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg, actionLabel, action) {
    clearTimeout(toastTimer);
    el.toast.replaceChildren(h("span", {}, msg));
    if (actionLabel) {
      el.toast.append(h("button", { type: "button", onclick: () => { el.toast.hidden = true; action(); } }, actionLabel));
    }
    el.toast.hidden = false;
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, actionLabel ? 6000 : 2500);
  }

  // ---------- Wiring ----------
  el.search.addEventListener("input", () => { ui.query = el.search.value; render(); });
  el.search.addEventListener("keydown", e => {
    // Enter opens the top result
    if (e.key === "Enter") {
      const first = el.grid.querySelector(".card-name");
      if (first && ui.query.trim()) window.open(first.href, "_blank", "noopener");
    }
    if (e.key === "Escape") { el.search.value = ""; ui.query = ""; render(); }
  });
  el.sort.value = ui.sort;
  el.sort.addEventListener("change", () => { ui.sort = el.sort.value; localSet("gamefinder.sort", ui.sort); render(); });
  el.addBtn.addEventListener("click", () => openGameForm());
  el.emptyAdd.addEventListener("click", () => openGameForm(null, ui.query.trim()));

  document.querySelectorAll("dialog [data-close]").forEach(b =>
    b.addEventListener("click", () => b.closest("dialog").close()));
  // Tap outside a dialog to close it
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) d.close();
  }));

  // "/" focuses search on desktop
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== el.search && !document.querySelector("dialog[open]")) {
      e.preventDefault();
      el.search.focus();
    }
  });

  render();
})();
