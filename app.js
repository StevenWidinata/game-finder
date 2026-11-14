(() => {
  "use strict";

  const STORAGE_KEY = "gamefinder.v1";
  const TIERS = ["S", "A", "B", "C", "D"];
  const TIER_LABELS = { S: "Best ever", A: "Great", B: "Good", C: "Okay", D: "Meh" };
  const STARTER = (window.STARTER_GAMES || []).map(g => ({ ...g, starter: true }));
  const STARTER_BY_ID = new Map(STARTER.map(g => [g.id, g]));
  const ALL = "__all", FAV = "__fav", UNPLAYED = "__unplayed";

  const today = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time

  // ---------- Saved state ----------
  // custom:    games the user added
  // overrides: edits to starter games, by id
  // tiers:     { gameId: "S" | "A" | ... }
  // hidden:    starter game ids the user removed
  // favorites: game ids pinned to the top
  // played:    { day: "YYYY-MM-DD", ids: [...] } — resets each day
  // settings:  { icons: boolean }
  const emptyState = () => ({
    custom: [], overrides: {}, tiers: {}, hidden: [], favorites: [],
    played: { day: "", ids: [] }, settings: { icons: true },
  });

  const isObj = o => o && typeof o === "object" && !Array.isArray(o);
  const strList = a => (Array.isArray(a) ? a.filter(x => typeof x === "string") : []);

  function normalizeState(s) {
    const base = emptyState();
    if (!isObj(s)) return base;
    if (Array.isArray(s.custom)) {
      base.custom = s.custom
        .filter(g => isObj(g) && typeof g.id === "string" && typeof g.name === "string" && fixUrl(g.url))
        .map(g => ({
          id: g.id, name: g.name.slice(0, 60), url: fixUrl(g.url),
          category: typeof g.category === "string" ? g.category.slice(0, 30) : "Other",
          description: typeof g.description === "string" ? g.description.slice(0, 160) : "",
          tags: strList(g.tags),
        }));
    }
    if (isObj(s.overrides)) {
      for (const [id, o] of Object.entries(s.overrides)) {
        if (!STARTER_BY_ID.has(id) || !isObj(o)) continue;
        const url = fixUrl(o.url);
        base.overrides[id] = {
          ...(typeof o.name === "string" && { name: o.name.slice(0, 60) }),
          ...(url && { url }),
          ...(typeof o.category === "string" && { category: o.category.slice(0, 30) }),
          ...(typeof o.description === "string" && { description: o.description.slice(0, 160) }),
        };
      }
    }
    if (isObj(s.tiers)) for (const [k, v] of Object.entries(s.tiers)) if (TIERS.includes(v)) base.tiers[k] = v;
    base.hidden = strList(s.hidden);
    base.favorites = strList(s.favorites);
    if (isObj(s.played) && typeof s.played.day === "string") base.played = { day: s.played.day, ids: strList(s.played.ids) };
    if (isObj(s.settings) && typeof s.settings.icons === "boolean") base.settings.icons = s.settings.icons;
    return base;
  }

  function writeLocal() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { toast("Couldn't save — your browser may be blocking storage."); }
  }
  function loadState() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? normalizeState(JSON.parse(raw)) : emptyState(); }
    catch { return emptyState(); }
  }
  // Every user change goes through commit(): save, then redraw.
  function commit() {
    writeLocal();
    render();
  }
  function localGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
  function localSet(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* ignore */ } }

  let state = loadState();

  // ---------- Game helpers ----------
  const isPlayed = id => state.played.day === today() && state.played.ids.includes(id);
  const isFav = id => state.favorites.includes(id);

  function allGames() {
    const hidden = new Set(state.hidden);
    const starters = STARTER.filter(g => !hidden.has(g.id)).map(g => ({ ...g, ...(state.overrides[g.id] || {}) }));
    return [...starters, ...state.custom.map(g => ({ ...g, starter: false }))].map(decorate);
  }
  const decorate = g => ({ ...g, tier: state.tiers[g.id] || null, fav: isFav(g.id), played: isPlayed(g.id) });
  const findGame = id => allGames().find(g => g.id === id);

  function setPlayed(id, on) {
    if (state.played.day !== today()) state.played = { day: today(), ids: [] };
    const ids = new Set(state.played.ids);
    on ? ids.add(id) : ids.delete(id);
    state.played.ids = [...ids];
    commit();
  }
  function toggleFav(id) {
    state.favorites = isFav(id) ? state.favorites.filter(x => x !== id) : [...state.favorites, id];
    commit();
  }
  function setTier(id, t) {
    if (t) state.tiers[id] = t; else delete state.tiers[id];
    commit();
  }

  // ---------- UI state ----------
  const ui = {
    query: "",
    filter: ALL,       // ALL | FAV | UNPLAYED | a category name
    tier: "all",       // "all" | "S".."D" | "none"
    sort: localGet("gamefinder.sort") || "tier",
    view: localGet("gamefinder.view") === "board" ? "board" : "list",
    shared: null,      // tier rows from a shared link, when viewing one
  };

  // ---------- Elements ----------
  const $ = sel => document.querySelector(sel);
  const el = {
    search: $("#search"), categories: $("#categories"), tierFilter: $("#tierFilter"), listToolbar: $("#listToolbar"),
    sort: $("#sort"), grid: $("#grid"), count: $("#count"), footNote: $("#footNote"),
    tabList: $("#tabList"), tabBoard: $("#tabBoard"),
    board: $("#board"), boardHead: $("#boardHead"), boardRows: $("#boardRows"), shareBtn: $("#shareBtn"),
    empty: $("#empty"), emptyText: $("#emptyText"), emptyAdd: $("#emptyAdd"),
    addBtn: $("#addBtn"), randomBtn: $("#randomBtn"), settingsBtn: $("#settingsBtn"),
    gameDialog: $("#gameDialog"), gameForm: $("#gameForm"), gameDialogTitle: $("#gameDialogTitle"),
    formTiers: $("#formTiers"), categoryList: $("#categoryList"),
    tierDialog: $("#tierDialog"), tierGameName: $("#tierGameName"), tierOptions: $("#tierOptions"), tierLegend: $("#tierLegend"),
    randomDialog: $("#randomDialog"), randomBody: $("#randomBody"), randomAgain: $("#randomAgain"), randomPlay: $("#randomPlay"),
    shareDialog: $("#shareDialog"), shareUrl: $("#shareUrl"), shareCopy: $("#shareCopy"), shareNative: $("#shareNative"),
    sharedBanner: $("#sharedBanner"), sharedCopy: $("#sharedCopy"), sharedExit: $("#sharedExit"),
    settingsDialog: $("#settingsDialog"), iconsToggle: $("#iconsToggle"),
    confirmDialog: $("#confirmDialog"), confirmText: $("#confirmText"), confirmOk: $("#confirmOk"),
    exportBtn: $("#exportBtn"), importInput: $("#importInput"), resetBtn: $("#resetBtn"),
    toast: $("#toast"),
  };

  // ---------- Helpers ----------
  const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
  function fixUrl(u) {
    u = typeof u === "string" ? u.trim() : "";
    if (!u) return "";
    if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = "https://" + u;
    try { const p = new URL(u); return /^https?:$/.test(p.protocol) ? p.href : ""; } catch { return ""; }
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
    for (const c of children.flat()) if (c != null && c !== false) node.append(c);
    return node;
  }
  const tierColor = t => (t ? `var(--tier-${t})` : "");

  function gameIcon(g, cls = "card-icon") {
    const letter = (g.name.trim()[0] || "?").toUpperCase();
    const box = h("div", { class: cls, "aria-hidden": "true" });
    if (!state.settings.icons) { box.textContent = letter; return box; }
    const img = h("img", {
      src: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(g.url))}&sz=64`,
      alt: "", loading: "lazy", width: "28", height: "28", draggable: "false",
    });
    img.addEventListener("error", () => { box.textContent = letter; });
    box.append(img);
    return box;
  }

  // Open a game in a new tab and tick it off for today.
  // (Ticking is deferred so the link's own navigation isn't disturbed by the redraw.)
  function markOpened(id) { if (findGame(id)) setTimeout(() => setPlayed(id, true), 0); }

  // ---------- Search & filters ----------
  function matches(g, words) {
    if (!words.length) return true;
    const hay = norm([g.name, g.description, g.category, hostOf(g.url), ...(g.tags || [])].join(" "));
    const compactName = norm(g.name).replace(/[^a-z0-9]/g, "");
    return words.every(w => hay.includes(w) || (w.length > 2 && compactName.includes(w.replace(/[^a-z0-9]/g, ""))));
  }
  const searchWords = () => norm(ui.query).split(/\s+/).filter(Boolean);
  function passesFilter(g) {
    if (ui.filter === ALL) return true;
    if (ui.filter === FAV) return g.fav;
    if (ui.filter === UNPLAYED) return !g.played;
    return (g.category || "Other") === ui.filter;
  }
  const passesTier = g => ui.tier === "all" || (ui.tier === "none" ? !g.tier : g.tier === ui.tier);

  // The games currently shown in the list view (also used by the 🎲 button).
  function visibleListGames() {
    const words = searchWords();
    const list = allGames().filter(g => matches(g, words) && passesFilter(g) && passesTier(g));
    const tierRank = t => (t ? TIERS.indexOf(t) : TIERS.length);
    const byName = (a, b) => a.name.localeCompare(b.name);
    const bySort = ui.sort === "name" ? byName
      : ui.sort === "category" ? (a, b) => (a.category || "").localeCompare(b.category || "") || byName(a, b)
      : (a, b) => tierRank(a.tier) - tierRank(b.tier) || byName(a, b);
    // Favorites are always pinned to the top.
    return list.sort((a, b) => (b.fav - a.fav) || bySort(a, b));
  }

  // ---------- Render ----------
  function render() {
    const games = allGames();
    const words = searchWords();
    const searched = games.filter(g => matches(g, words));
    const cats = [...new Set(games.map(g => g.category || "Other"))].sort((a, b) => a.localeCompare(b));
    if (![ALL, FAV, UNPLAYED, ...cats].includes(ui.filter)) ui.filter = ALL;

    // Tabs
    const inBoard = ui.view === "board" || !!ui.shared;
    el.tabList.setAttribute("aria-selected", String(!inBoard));
    el.tabBoard.setAttribute("aria-selected", String(inBoard));
    el.sharedBanner.hidden = !ui.shared;
    el.boardHead.hidden = !!ui.shared;

    if (ui.shared) {
      el.categories.hidden = true;
      el.listToolbar.hidden = true;
      el.grid.hidden = true;
      el.board.hidden = false;
      el.empty.hidden = true;
      const n = TIERS.reduce((s, t) => s + ui.shared[t].length, 0);
      el.count.textContent = `${n} rated game${n === 1 ? "" : "s"}`;
      renderBoard(ui.shared, false);
      renderFoot(games);
      return;
    }
    el.categories.hidden = false;

    // Filter chips: All · ★ Favorites · Not played today · categories
    const chip = (value, label, n) => h("button", {
      class: "chip" + (value === FAV || value === UNPLAYED ? " special" : ""), type: "button",
      "aria-pressed": String(ui.filter === value),
      onclick: () => { ui.filter = value; render(); },
    }, label, h("span", { class: "n" }, String(n)));
    el.categories.replaceChildren(
      chip(ALL, "All", searched.length),
      chip(FAV, "★ Favorites", searched.filter(g => g.fav).length),
      chip(UNPLAYED, "Not played today", searched.filter(g => !g.played).length),
      ...cats.map(c => chip(c, c, searched.filter(g => (g.category || "Other") === c).length)),
    );
    el.categoryList.replaceChildren(...cats.map(c => h("option", { value: c })));

    if (inBoard) {
      el.listToolbar.hidden = true;
      el.grid.hidden = true;
      el.board.hidden = false;
      const shown = searched.filter(passesFilter);
      const rows = Object.fromEntries([...TIERS, ""].map(t => [t, []]));
      for (const g of shown.sort((a, b) => a.name.localeCompare(b.name))) rows[g.tier || ""].push(g);
      el.count.textContent = `${shown.length} game${shown.length === 1 ? "" : "s"} · ${shown.filter(g => g.tier).length} rated`;
      renderBoard(rows, true);
      showEmpty(shown.length === 0);
    } else {
      el.listToolbar.hidden = false;
      el.grid.hidden = false;
      el.board.hidden = true;
      renderTierFilter();
      const list = visibleListGames();
      el.grid.replaceChildren(...list.map(card));
      const playedCount = games.filter(g => g.played).length;
      el.count.textContent = `${list.length} game${list.length === 1 ? "" : "s"}` + (playedCount ? ` · ✓ ${playedCount} played today` : "");
      showEmpty(list.length === 0);
    }
    renderFoot(games);
  }

  function showEmpty(isEmpty) {
    el.empty.hidden = !isEmpty;
    if (!isEmpty) return;
    const q = ui.query.trim();
    el.emptyText.textContent = q ? `No games match “${q}”.`
      : ui.filter === FAV ? "No favorites yet — tap ☆ on a game to add it."
      : ui.filter === UNPLAYED ? "🎉 You've played everything today!"
      : "No games here.";
    el.emptyAdd.hidden = !q;
  }

  function renderFoot(games) {
    el.footNote.textContent = `Saved in this browser · move it to another device with ⚙️ → Export / Import · ${games.length} games`;
  }

  function renderTierFilter() {
    el.tierFilter.replaceChildren(
      h("button", { type: "button", class: "all", "aria-pressed": String(ui.tier === "all"), onclick: () => { ui.tier = "all"; render(); } }, "All tiers"),
      ...TIERS.map(t => h("button", {
        type: "button", "data-tier": t, style: `--tc:${tierColor(t)}`,
        title: `${t} — ${TIER_LABELS[t]}`, "aria-pressed": String(ui.tier === t),
        onclick: () => { ui.tier = ui.tier === t ? "all" : t; render(); },
      }, t)),
      h("button", { type: "button", class: "all", "aria-pressed": String(ui.tier === "none"),
        title: "Games you haven't rated yet", onclick: () => { ui.tier = ui.tier === "none" ? "all" : "none"; render(); } }, "Unrated"),
    );
  }

  function card(g) {
    const badge = h("button", {
      class: "tier-badge" + (g.tier ? "" : " none"), type: "button",
      style: g.tier ? `--tc:${tierColor(g.tier)}` : null,
      title: g.tier ? `Fun tier ${g.tier} — tap to change` : "Tap to rate how fun it is",
      "aria-label": g.tier ? `Fun tier ${g.tier}, change` : `Rate ${g.name}`,
      onclick: () => openTierPicker(g.id),
    }, g.tier || "Rate");

    return h("article", { class: "card" + (g.played ? " played" : "") },
      gameIcon(g),
      h("div", { class: "card-body" },
        h("a", { class: "card-name", href: g.url, target: "_blank", rel: "noopener noreferrer", onclick: () => markOpened(g.id) },
          g.fav ? h("span", { class: "fav-star", "aria-label": "Favorite" }, "★ ") : null, g.name),
        g.description ? h("p", { class: "card-desc" }, g.description) : null,
        h("div", { class: "card-meta" },
          h("span", { class: "tag" }, g.category || "Other"),
          h("span", { class: "host" }, hostOf(g.url)),
        ),
        h("div", { class: "card-actions" },
          h("button", {
            class: "act" + (g.played ? " on-played" : ""), type: "button", "aria-pressed": String(g.played),
            title: g.played ? "Played today — tap to undo" : "Mark as played today",
            onclick: () => setPlayed(g.id, !g.played),
          }, g.played ? "✓ Played" : "○ Played?"),
          h("button", {
            class: "act" + (g.fav ? " on-fav" : ""), type: "button", "aria-pressed": String(g.fav),
            title: g.fav ? "Remove from favorites" : "Add to favorites", "aria-label": g.fav ? `Unfavorite ${g.name}` : `Favorite ${g.name}`,
            onclick: () => toggleFav(g.id),
          }, g.fav ? "★" : "☆"),
          h("button", { class: "act", type: "button", title: "Edit", "aria-label": `Edit ${g.name}`, onclick: () => openGameForm(g.id) }, "✎"),
          h("button", { class: "act", type: "button", title: "Remove", "aria-label": `Remove ${g.name}`, onclick: () => removeGame(g.id) }, "🗑"),
        ),
      ),
      h("div", { class: "card-side" }, badge),
    );
  }

  // ---------- Tier board ----------
  function renderBoard(rows, editable) {
    const rowEl = t => {
      const games = rows[t] || [];
      return h("div", { class: "tier-row", "data-tier": t },
        h("div", { class: "tier-label" + (t ? "" : " unrated"), style: t ? `--tc:${tierColor(t)}` : null },
          h("strong", {}, t || "?"), h("small", {}, t ? TIER_LABELS[t] : "Unrated")),
        h("div", { class: "tier-drop" },
          games.length ? games.map(g => boardChip(g, editable))
            : h("span", { class: "drop-hint" }, editable ? (t ? "Drop games here" : "Everything is rated 🎉") : "—")),
      );
    };
    const tiers = editable ? [...TIERS, ""] : TIERS;
    el.boardRows.replaceChildren(...tiers.map(rowEl));
  }

  function boardChip(g, editable) {
    const inner = [gameIcon(g, "chip-icon"), h("span", { class: "chip-name" }, g.name)];
    if (!editable) return h("a", { class: "chip-game", href: g.url, target: "_blank", rel: "noopener noreferrer" }, inner);
    return h("button", {
      class: "chip-game" + (g.played ? " played" : ""), type: "button", "data-id": g.id,
      title: `${g.name} — drag to a row, or tap to pick a tier`,
    }, inner);
  }

  // Drag & drop with pointer events (mouse: drag right away; touch: press-and-hold, then drag).
  (function enableBoardDrag() {
    let drag = null;
    let suppressClick = false;

    el.boardRows.addEventListener("click", e => {
      const chip = e.target.closest("button.chip-game");
      if (!chip) return;
      if (suppressClick) { suppressClick = false; return; }
      openTierPicker(chip.dataset.id);
    });
    el.boardRows.addEventListener("contextmenu", e => { if (e.target.closest(".chip-game")) e.preventDefault(); });

    el.boardRows.addEventListener("pointerdown", e => {
      const chip = e.target.closest("button.chip-game");
      if (!chip || e.button > 0) return;
      drag = { id: chip.dataset.id, chip, x: e.clientX, y: e.clientY, px: e.clientX, py: e.clientY,
        pointerId: e.pointerId, touch: e.pointerType !== "mouse", active: false, timer: 0, raf: 0 };
      if (drag.touch) drag.timer = setTimeout(() => start(), 300);
    });

    window.addEventListener("pointermove", e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      drag.px = e.clientX; drag.py = e.clientY;
      if (!drag.active) {
        const dist = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
        if (drag.touch) { if (dist > 10) cancel(); return; } // finger moved before hold finished → it's a scroll
        if (dist < 6) return;
        start();
      }
      move();
    });
    window.addEventListener("pointerup", e => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      if (drag.active) {
        const row = rowAt(drag.px, drag.py);
        const id = drag.id;
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, 400);
        cleanup();
        if (row) {
          const t = row.dataset.tier || null;
          if ((findGame(id)?.tier || null) !== t) setTier(id, t);
        }
      } else {
        cleanup();
      }
    });
    window.addEventListener("pointercancel", () => cancel());
    // While dragging on a touch screen, stop the page from scrolling.
    document.addEventListener("touchmove", e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });

    function start() {
      if (!drag) return;
      clearTimeout(drag.timer);
      drag.active = true;
      const r = drag.chip.getBoundingClientRect();
      drag.offX = drag.x - r.left; drag.offY = drag.y - r.top;
      drag.ghost = drag.chip.cloneNode(true);
      drag.ghost.classList.add("ghost");
      drag.ghost.style.width = r.width + "px";
      document.body.append(drag.ghost);
      drag.chip.classList.add("dragging");
      document.body.classList.add("is-dragging");
      if (navigator.vibrate && drag.touch) navigator.vibrate(15);
      move();
      autoScroll();
    }
    function move() {
      if (!drag?.ghost) return;
      drag.ghost.style.transform = `translate(${drag.px - drag.offX}px, ${drag.py - drag.offY}px) rotate(-2deg)`;
      const row = rowAt(drag.px, drag.py);
      document.querySelectorAll(".tier-row.over").forEach(r => r !== row && r.classList.remove("over"));
      row?.classList.add("over");
    }
    function autoScroll() {
      if (!drag?.active) return;
      const edge = 70;
      if (drag.py < edge) window.scrollBy(0, -10);
      else if (drag.py > window.innerHeight - edge) window.scrollBy(0, 10);
      move();
      drag.raf = requestAnimationFrame(autoScroll);
    }
    function rowAt(x, y) {
      const node = document.elementFromPoint(x, y);
      return node ? node.closest("#boardRows .tier-row") : null;
    }
    function cancel() { cleanup(); }
    function cleanup() {
      if (!drag) return;
      clearTimeout(drag.timer);
      cancelAnimationFrame(drag.raf);
      drag.ghost?.remove();
      drag.chip.classList.remove("dragging");
      document.querySelectorAll(".tier-row.over").forEach(r => r.classList.remove("over"));
      document.body.classList.remove("is-dragging");
      drag = null;
    }
  })();

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
    el.tierLegend.textContent = TIERS.map(t => `${t} = ${TIER_LABELS[t]}`).join(" · ");
    tierButtons(el.tierOptions, g.tier, t => { el.tierDialog.close(); setTier(tierTarget, t); });
    el.tierDialog.showModal();
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
    f.url.setCustomValidity("");
    const isCat = ui.filter !== ALL && ui.filter !== FAV && ui.filter !== UNPLAYED;
    f.category.value = g ? (g.category || "") : (isCat ? ui.filter : "");
    f.description.value = g ? (g.description || "") : "";
    f.favorite.checked = g ? g.fav : ui.filter === FAV;
    formTier = g ? g.tier : null;
    const drawTiers = () => tierButtons(el.formTiers, formTier, t => { formTier = t; drawTiers(); });
    drawTiers();
    el.gameDialog.showModal();
    setTimeout(() => (g || !prefillName ? f.name : f.url).focus(), 50);
  }

  el.gameForm.addEventListener("submit", e => {
    e.preventDefault();
    const f = el.gameForm.elements;
    const name = f.name.value.trim();
    const url = fixUrl(f.url.value);
    if (!name) { f.name.focus(); return; }
    if (!url) { f.url.setCustomValidity("Please enter a valid link, like wordle.com"); f.url.reportValidity(); return; }
    const data = { name, url, category: f.category.value.trim() || "Other", description: f.description.value.trim() };

    let id = editingId;
    if (!id) {
      id = slug(name);
      state.custom.push({ id, ...data, tags: [] });
      toast(`Added ${name}`);
    } else if (STARTER_BY_ID.has(id)) {
      state.overrides[id] = data;
      toast(`Saved ${name}`);
    } else {
      const i = state.custom.findIndex(g => g.id === id);
      if (i >= 0) state.custom[i] = { ...state.custom[i], ...data };
      toast(`Saved ${name}`);
    }
    if (formTier) state.tiers[id] = formTier; else delete state.tiers[id];
    state.favorites = state.favorites.filter(x => x !== id);
    if (f.favorite.checked) state.favorites.push(id);
    el.gameDialog.close();
    commit();
  });
  el.gameForm.elements.url.addEventListener("input", e => e.target.setCustomValidity(""));

  // ---------- Remove (with undo) ----------
  function removeGame(id) {
    const g = findGame(id);
    if (!g) return;
    const before = JSON.stringify(state);
    if (g.starter) state.hidden.push(id);
    else state.custom = state.custom.filter(x => x.id !== id);
    commit();
    toast(`Removed ${g.name}`, "Undo", () => { state = normalizeState(JSON.parse(before)); commit(); });
  }

  // ---------- Random game ----------
  let lastRandom = null;
  function pickRandom() {
    const pool = ui.view === "board" ? allGames().filter(g => matches(g, searchWords()) && passesFilter(g)) : visibleListGames();
    if (!pool.length) { toast("No games to pick from — clear your filters."); return; }
    const fresh = pool.filter(g => !g.played);
    let choices = fresh.length ? fresh : pool;
    if (choices.length > 1) choices = choices.filter(g => g.id !== lastRandom);
    // Better-rated games come up a bit more often.
    const weight = g => ({ S: 5, A: 4, B: 3, C: 2, D: 1 })[g.tier] || 2.5;
    let r = Math.random() * choices.reduce((s, g) => s + weight(g), 0);
    const g = choices.find(c => (r -= weight(c)) <= 0) || choices[choices.length - 1];
    lastRandom = g.id;

    el.randomBody.replaceChildren(
      h("div", { class: "random-head" },
        gameIcon(g),
        h("div", {},
          h("h2", {}, g.name),
          h("span", { class: "tag" }, g.category || "Other"),
          g.tier ? h("span", { class: "tier-mini", style: `--tc:${tierColor(g.tier)}` }, g.tier) : null),
      ),
      g.description ? h("p", { class: "muted" }, g.description) : null,
      !fresh.length ? h("p", { class: "muted small" }, "You've played everything here today — here's one to replay!") : null,
    );
    el.randomPlay.href = g.url;
    el.randomPlay.onclick = () => { el.randomDialog.close(); markOpened(g.id); };
    if (!el.randomDialog.open) el.randomDialog.showModal();
  }

  // ---------- Share link ----------
  function b64urlEncode(str) {
    let bin = "";
    new TextEncoder().encode(str).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
  }
  function shareLink() {
    const t = {};
    for (const g of allGames()) if (g.tier) (t[g.tier] ||= []).push(g.starter ? g.id : [g.name, g.url]);
    if (!Object.keys(t).length) return null;
    return `${location.origin}${location.pathname}#share=${b64urlEncode(JSON.stringify({ v: 1, t }))}`;
  }
  function readSharedFromHash() {
    const m = /^#share=([A-Za-z0-9_-]+)$/.exec(location.hash);
    if (!m) return null;
    try {
      const data = JSON.parse(b64urlDecode(m[1]));
      let n = 0;
      const rows = {};
      for (const t of TIERS) {
        const list = isObj(data.t) && Array.isArray(data.t[t]) ? data.t[t] : [];
        rows[t] = list.map(e => {
          if (typeof e === "string") { const g = STARTER_BY_ID.get(e); return g ? { ...g, tier: t } : null; }
          if (Array.isArray(e) && typeof e[0] === "string") {
            const url = fixUrl(e[1]);
            return url ? { id: `shared-${n++}`, name: e[0].slice(0, 60), url, category: "", description: "", starter: false, tier: t } : null;
          }
          return null;
        }).filter(Boolean).slice(0, 300);
      }
      return rows;
    } catch {
      return null;
    }
  }
  function applyHash() {
    ui.shared = readSharedFromHash();
    if (location.hash.startsWith("#share=") && !ui.shared) toast("That share link looks broken.");
    render();
  }
  function exitShared() {
    history.replaceState(null, "", location.pathname + location.search);
    ui.shared = null;
    render();
  }

  el.shareBtn.addEventListener("click", () => {
    const url = shareLink();
    if (!url) { toast("Rate some games first, then share!"); return; }
    el.shareUrl.value = url;
    el.shareNative.hidden = !navigator.share;
    el.shareDialog.showModal();
    el.shareUrl.select();
  });
  el.shareCopy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(el.shareUrl.value); toast("Link copied!"); }
    catch { el.shareUrl.select(); toast("Select the link and copy it."); }
  });
  el.shareNative.addEventListener("click", () => {
    navigator.share({ title: "My game tier list", url: el.shareUrl.value }).catch(() => {});
  });
  el.sharedExit.addEventListener("click", exitShared);
  el.sharedCopy.addEventListener("click", () => {
    confirmBox("Copy these tiers into your own list? Your tiers for these games will be replaced.", "Copy", () => {
      const rows = ui.shared;
      for (const t of TIERS) for (const g of rows[t]) {
        let id = g.id;
        if (g.starter) {
          state.hidden = state.hidden.filter(x => x !== id);
        } else {
          const existing = state.custom.find(c => c.url === g.url);
          if (existing) id = existing.id;
          else { id = slug(g.name); state.custom.push({ id, name: g.name, url: g.url, category: "Other", description: "", tags: [] }); }
        }
        state.tiers[id] = t;
      }
      exitShared();
      commit();
      toast("Tiers copied!");
    });
  });
  window.addEventListener("hashchange", applyHash);

  // Coming back to the tab (e.g. the next morning) refreshes "played today".
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") render(); });

  // ---------- Settings ----------
  el.settingsBtn.addEventListener("click", () => {
    el.iconsToggle.checked = state.settings.icons;
    el.settingsDialog.showModal();
  });
  el.iconsToggle.addEventListener("change", () => { state.settings.icons = el.iconsToggle.checked; commit(); });

  // ---------- Confirm ----------
  function confirmBox(text, okLabel, onOk) {
    el.confirmText.textContent = text;
    el.confirmOk.textContent = okLabel;
    el.confirmOk.onclick = () => { el.confirmDialog.close(); onOk(); };
    el.confirmDialog.showModal();
  }

  // ---------- Export / Import / Reset ----------
  el.exportBtn.addEventListener("click", () => {
    const payload = { app: "game-finder", version: 2, exportedAt: new Date().toISOString(), ...state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `game-finder-${today()}.json` });
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
      if (!isObj(data) || (data.app && data.app !== "game-finder")) throw new Error("wrong file");
      const incoming = normalizeState(data);
      confirmBox("Replace your current games and tiers with this file?", "Import", () => {
        state = incoming;
        commit();
        toast("Imported!");
      });
    } catch {
      toast("That file doesn't look like a Game Finder export.");
    }
  });
  el.importInput.parentElement.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.importInput.click(); }
  });
  el.resetBtn.addEventListener("click", () => {
    confirmBox("Reset everything? Your added games, edits, tiers and favorites will be cleared.", "Reset", () => {
      const icons = state.settings.icons;
      state = emptyState();
      state.settings.icons = icons;
      commit();
      toast("Back to the starter list");
    });
  });

  // ---------- Toast ----------
  let toastTimer;
  // The toast is a popover so it shows above open dialogs (where supported).
  function hideToast() {
    el.toast.hidden = true;
    try { el.toast.hidePopover(); } catch { /* not open / unsupported */ }
  }
  function toast(msg, actionLabel, action) {
    clearTimeout(toastTimer);
    el.toast.replaceChildren(h("span", {}, msg));
    if (actionLabel) el.toast.append(h("button", { type: "button", onclick: () => { hideToast(); action(); } }, actionLabel));
    hideToast();
    el.toast.hidden = false;
    try { el.toast.showPopover(); } catch { /* unsupported: plain fixed element */ }
    toastTimer = setTimeout(hideToast, actionLabel ? 6000 : 2800);
  }

  // ---------- Wiring ----------
  function setView(v) {
    if (ui.shared) exitShared();
    ui.view = v;
    localSet("gamefinder.view", v);
    render();
  }
  el.tabList.addEventListener("click", () => setView("list"));
  el.tabBoard.addEventListener("click", () => setView("board"));

  el.search.addEventListener("input", () => { ui.query = el.search.value; render(); });
  el.search.addEventListener("keydown", e => {
    if (e.key === "Enter" && ui.query.trim() && ui.view === "list") {
      const first = visibleListGames()[0];
      if (first) { window.open(first.url, "_blank", "noopener"); markOpened(first.id); }
    }
    if (e.key === "Escape") { el.search.value = ""; ui.query = ""; render(); }
  });
  el.sort.value = ui.sort;
  el.sort.addEventListener("change", () => { ui.sort = el.sort.value; localSet("gamefinder.sort", ui.sort); render(); });
  el.addBtn.addEventListener("click", () => openGameForm());
  el.emptyAdd.addEventListener("click", () => openGameForm(null, ui.query.trim()));
  el.randomBtn.addEventListener("click", pickRandom);
  el.randomAgain.addEventListener("click", pickRandom);

  document.querySelectorAll("dialog [data-close]").forEach(b => b.addEventListener("click", () => b.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach(d => d.addEventListener("click", e => {
    if (e.target !== d) return;
    const r = d.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
  }));
  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== el.search && !document.querySelector("dialog[open]")) {
      e.preventDefault();
      el.search.focus();
    }
  });

  applyHash();
})();
