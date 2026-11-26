/* ===== MENUS / LOBBY / HERO SHOP / QUESTS / RESULTS ===== */
(function () {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const MODES = { 1: "1 v 1 Duel", 3: "3 v 3 Skirmish", 5: "5 v 5 Classic" };
  let mode = 1,
    shopMode = false,
    activeFilter = "All",
    viewHero = null;

  Save.load();

  function show(id) { $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id)); if (id !== "select" && id !== "draft") Sound.heroVoiceStop(); if (id !== "draft") drStop(); }
  function coins() { $$(".coins").forEach((e) => (e.textContent = Save.data.coins)); }
  function setAvatar(el, h) { HeroArt.paint(el, h); }
  function hasClaimableQuest() {
    return (typeof QUESTS !== "undefined" ? QUESTS : []).some(
      (q) => !Save.data.claimed.includes(q.id) && (Save.data.stats[q.need] || 0) >= q.target
    );
  }

  function lobby() {
    const h = HEROES.find((x) => x.id === Save.data.selected) || HEROES[0];
    setAvatar($("#lobbyPort"), h);
    const xp = Save.data.xp || 0, lv = 1 + Math.floor(Math.sqrt(xp / 60)), lo = 60 * (lv - 1) ** 2, hi = 60 * lv ** 2;
    $("#lobbyLv").textContent = "Lv. " + lv;
    $("#lobbyName").textContent = h.name + " · " + h.role;
    $("#lobbyStats").textContent = `Matches ${Save.data.stats.played} · Wins ${Save.data.stats.wins}`;
    $("#lobbyXpFill").style.width = Math.round(((xp - lo) / (hi - lo)) * 100) + "%";
    $("#dockModeTxt").textContent = MODES[mode] || "1 v 1 Duel";
    $("#questDot").classList.toggle("hidden", !hasClaimableQuest());
    coins();
    toggles();
  }
  function toLobby() { Battle.stop(); lobby(); show("lobby"); Sound.startMusic("lobby"); }

  function toggles() {
    $("#tglSfx").textContent = Save.data.sfx ? "🔊" : "🔇";
    $("#tglMusic").textContent = Save.data.music ? "🎵" : "🔕";
    $("#pSfx").textContent = "Sound FX: " + (Save.data.sfx ? "ON" : "OFF");
    $("#pMusic").textContent = "Music: " + (Save.data.music ? "ON" : "OFF");
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    $("#tglFs").classList.toggle("on", isFs);
    $("#pFs").textContent = isFs ? "⛶ Exit Full View" : "⛶ Full View";
  }
  function toggleSfx() { Save.data.sfx = !Save.data.sfx; Save.save(); toggles(); if (!Save.data.sfx) Sound.annReset(); Sound.sfx("click"); }
  function toggleMusic() { Save.data.music = !Save.data.music; Save.save(); toggles(); Sound.refresh(); }

  function lockLandscape() {
    try { screen.orientation && screen.orientation.lock && screen.orientation.lock("landscape").catch(() => {}); } catch (e) {}
  }
  function enterFs() {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    try {
      const p = req.call(el);
      if (p && p.then) p.then(() => { lockLandscape(); toggles(); }).catch(() => {});
      else { lockLandscape(); toggles(); }
    } catch (e) {}
  }
  function toggleFs() {
    Sound.sfx("click");
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      try { ex && ex.call(document); } catch (e) {}
    } else enterFs();
    setTimeout(toggles, 120);
  }
  document.addEventListener("fullscreenchange", toggles);
  document.addEventListener("webkitfullscreenchange", toggles);

  function openQuests() {
    $("#questsTitle").textContent = "📜 QUESTS & REWARDS";
    const list = $("#questList"), qs = typeof QUESTS !== "undefined" ? QUESTS : [];
    list.innerHTML = qs.map((q) => {
      const cur = Math.min(q.target, Save.data.stats[q.need] || 0);
      const claimed = Save.data.claimed.includes(q.id), ready = cur >= q.target && !claimed;
      return `<div class="q-item"><div><b>${q.title} (${cur}/${q.target})</b><small>${q.desc} · Reward 🪙${q.reward}</small></div>` +
        `<button class="btn small q-claim" data-id="${q.id}" ${ready ? "" : "disabled"}>${claimed ? "Claimed ✔" : ready ? "Claim 🪙" + q.reward : "Locked"}</button></div>`;
    }).join("");
    list.querySelectorAll(".q-claim").forEach((b) => {
      b.onclick = () => {
        const q = qs.find((x) => x.id === b.dataset.id);
        if (!q || Save.data.claimed.includes(q.id)) return;
        Save.data.claimed.push(q.id);
        Save.data.coins += q.reward;
        Save.save();
        Sound.sfx("buy");
        coins();
        $("#questDot").classList.toggle("hidden", !hasClaimableQuest());
        openQuests();
      };
    });
    $("#questsModal").classList.remove("hidden");
  }
  function openPrep() {
    $("#questsTitle").textContent = "⚔️ PREPARATION & CONTROLS";
    $("#questList").innerHTML =
      `<div class="q-item"><div><b>🎯 Tap or Drag Skills</b><small>Quick-tap auto-casts, or drag a skill button to manually aim!</small></div></div>` +
      `<div class="q-item"><div><b>📢 Quick Ping Wheel</b><small>Command allied AI bots: Attack, Fall Back, Backup, or Defend Base.</small></div></div>` +
      `<div class="q-item"><div><b>🏠 5s Recall &amp; Scaling Respawn</b><small>Channel Recall safely behind towers; taking damage cancels it.</small></div></div>` +
      `<div class="q-item"><div><b>🌿 Grass Bushes</b><small>Hide inside bushes for stealth—use Felix's Astral Wave to reveal enemies.</small></div></div>`;
    $("#questsModal").classList.remove("hidden");
  }

  function openHeroes(shop, focusId, filter) {
    shopMode = shop;
    activeFilter = filter || "All";
    viewHero = focusId || Save.data.selected;
    $("#selTitle").textContent = shop ? "HEROES & SHOP" : "CHOOSE YOUR HERO";
    $("#select .select-foot").style.display = shop ? "none" : "";
    renderRoleTabs();
    renderSelect();
    show("select");
  }
  function renderRoleTabs() {
    const tabs = ["All", "Owned", "Shop", "Fighter", "Mage", "Support", "Tank", "Assassin", "Marksman"];
    const box = $("#roleTabs");
    box.innerHTML = tabs.map((t) => `<button class="rtab${activeFilter === t ? " active" : ""}" data-t="${t}">${t}</button>`).join("");
    box.querySelectorAll(".rtab").forEach((b) => {
      b.onclick = () => { Sound.sfx("click"); activeFilter = b.dataset.t; renderRoleTabs(); renderSelect(); };
    });
  }

  /* ---------- HERO ART: see HeroArt in data.js (banners: heroes/<id>.*, heroes/<id>_banner.*, <id>_banner.*) ---------- */
  const ROLE_ICO = [["Tank", "🛡️"], ["Assassin", "🗡️"], ["Marksman", "🏹"], ["Fighter", "⚔️"], ["Control", "💠"], ["Mage", "🔮"], ["Support", "✚"]];
  const roleIcon = (r) => (ROLE_ICO.find(([k]) => r.includes(k)) || [0, "✦"])[1];
  let artTimer = 0;
  function onArt(h) {
    clearTimeout(artTimer);
    artTimer = setTimeout(() => {
      if ($("#select").classList.contains("active")) renderSelect();
      if ($("#lobby").classList.contains("active")) lobby();
      if ($("#practice").classList.contains("active")) renderPractice();
      if ($("#draft").classList.contains("active")) drArt(h);
      if (h.id === "felix") paintPromo();
    }, 60);
  }
  function paintPromo() {
    const f = HEROES.find((x) => x.id === "felix"), pa = $("#promoFelix .promo-art");
    if (f && f.img && pa) { pa.style.backgroundImage = `url('${f.img}')`; pa.style.backgroundSize = f._wide ? "auto 250%" : "cover"; pa.style.backgroundPosition = f._wide ? "50% 8%" : "center top"; }
  }
  const artStyle = (h) => (h.img ? `background-image:url('${h.img}')` : "");
  const wideCls = (h) => (h._wide ? " wide" : "");
  function playVoice(h) { if (!Sound.heroVoice(h)) Sound.sfx("click"); }

  function renderSelect() {
    coins();
    const g = $("#heroGrid"), keep = g.scrollTop;
    g.innerHTML = "";
    const list = HEROES.filter((h) => {
      const own = Save.owned(h.id);
      if (activeFilter === "Owned") return own;
      if (activeFilter === "Shop") return !own;
      if (activeFilter !== "All") return h.role.includes(activeFilter);
      return true;
    });
    list.forEach((h) => {
      const owned = Save.owned(h.id), sel = Save.data.selected === h.id;
      const el = document.createElement("div");
      el.className = "hero-card" + (owned ? "" : " locked") + (viewHero === h.id ? " sel" : "");
      el.style.setProperty("--c", h.color);
      el.title = h.name;
      el.innerHTML =
        `<div class="hc-art${h.img ? "" : " noart"}${wideCls(h)}" style="${artStyle(h)}">${h.img ? "" : h.emoji}</div>` +
        `<div class="hc-info"><b>${h.name}</b><small><i>${roleIcon(h.role)}</i> ${h.role}</small>` +
        (owned ? `<span class="tag ${sel ? "sel" : "own"}">${sel ? "SELECTED" : "OWNED"}</span>` : `<span class="tag buy">🔒 🪙${h.price}</span>`) + `</div>`;
      el.onclick = () => {
        playVoice(h);
        viewHero = h.id;
        if (owned) { Save.data.selected = h.id; Save.save(); }
        renderSelect();
      };
      g.appendChild(el);
    });
    g.scrollTop = keep;
    renderDetail();
  }
  /* v6.9 skill tooltips: hold (touch/mouse) or hover (desktop) an icon to read the skill */
  let skTip = null, skTimer = 0, skHide = 0;
  let skHost = null;
  function hideSkillTip() { clearTimeout(skTimer); clearTimeout(skHide); if (skTip) { skTip.remove(); skTip = null; } $$(".skb.on").forEach((x) => x.classList.remove("on")); }
  function showSkillTip(btn, t) {
    hideSkillTip();
    const host = skHost || $("#select");
    skTip = document.createElement("div");
    skTip.className = "sk-tip";
    skTip.innerHTML = `<b>${t.name}</b>${t.cd ? ` <small>${t.cd}</small>` : ""}<div class="sk-d">${t.desc}</div>`;
    host.appendChild(skTip);
    btn.classList.add("on");
    const hr = host.getBoundingClientRect(), br = btn.getBoundingClientRect(), tr = skTip.getBoundingClientRect(), pad = 6;
    let x = br.left + br.width / 2 - tr.width / 2 - hr.left;
    x = Math.max(pad, Math.min(x, hr.width - tr.width - pad));
    let y = br.top - tr.height - 8 - hr.top;                      // above the icon,
    if (y < pad) y = br.bottom + 8 - hr.top;                       // else below it
    skTip.style.left = x + "px"; skTip.style.top = y + "px";
  }
  function bindSkillTips(root, tips) {
    hideSkillTip();
    skHost = root.closest(".screen") || $("#select");
    root.querySelectorAll(".skb").forEach((btn) => {
      const t = tips[+btn.dataset.i]; let sx = 0, sy = 0;
      btn.addEventListener("contextmenu", (e) => e.preventDefault());
      btn.addEventListener("pointerdown", (e) => {
        sx = e.clientX; sy = e.clientY; clearTimeout(skTimer);
        skTimer = setTimeout(() => showSkillTip(btn, t), e.pointerType === "mouse" ? 150 : 350);
      });
      btn.addEventListener("pointermove", (e) => { if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) clearTimeout(skTimer); });
      const end = () => { clearTimeout(skTimer); clearTimeout(skHide); skHide = setTimeout(hideSkillTip, 1400); };
      ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => btn.addEventListener(ev, end));
      btn.addEventListener("mouseenter", () => { skTimer = setTimeout(() => showSkillTip(btn, t), 150); });
    });
  }
  function renderDetail() {
    const h = HEROES.find((x) => x.id === viewHero) || HEROES[0], owned = Save.owned(h.id);
    const bar = (ico, l, v, m) => `<div class="stat"><ins class="si">${ico}</ins><span>${l}</span><u><b style="width:${Math.min(100, (v / m) * 100)}%"></b></u><em>${v}</em></div>`;
    const d = $("#detail");
    d.style.setProperty("--c", h.color);
    const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    const skBtn = (s, i, passive) => `<button type="button" class="skb${passive ? " passive" : ""}" data-i="${i}" aria-label="${esc(s.name)}"><span class="ico">${passive ? RCIcon.passiveHtml(h) : RCIcon.skillHtml(h, i)}</span><small>${passive ? "Passive" : s.cd + "s"}</small></button>`;
    const tips = h.skills.map((s) => ({ name: s.name, cd: s.cd + "s", desc: s.desc }));
    if (h.passive) tips.push({ name: "Passive", cd: "", desc: h.passive });
    d.innerHTML =
      `<div class="d-art${h.img ? "" : " noart"}${wideCls(h)}" style="${artStyle(h)}">${h.img ? "" : h.emoji}</div>` +
      `<div class="d-body">` +
      `<div class="d-head"><div class="d-title"><h2>${h.name}</h2><span class="role-pill">${roleIcon(h.role)} ${h.role}</span></div>` +
      (h.quote ? `<p class="d-quote">\u201C${h.quote}\u201D</p>` : "") + `</div>` +
      `<div class="d-stats">` + bar("❤️", "HP", h.hp, 2100) + bar("⚔️", "ATK", h.atk, 80) + bar("🥾", "SPD", h.speed, 280) + bar("🎯", "RNG", h.range, 450) + `</div>` +
      `<div class="skills-row">` + h.skills.map((s, i) => skBtn(s, i, false)).join("") + (h.passive ? skBtn({ icon: "✨", name: "Passive" }, h.skills.length, true) : "") + `</div>` +
      `<div class="sk-hint">Hold an icon for skill info</div>` +
      (owned
        ? `<div class="owned">✔ ${Save.data.selected === h.id ? "Selected for Battle" : "Unlocked"}</div>`
        : `<button class="btn buy" id="btnBuy" ${Save.data.coins < h.price ? "disabled" : ""}>Unlock 🪙${h.price}</button>` +
          (Save.data.coins < h.price ? `<div class="muted need">Need ${h.price - Save.data.coins} more coins. Win matches or claim quests!</div>` : "")) +
      `</div>`;
    bindSkillTips(d, tips);
    const b = $("#btnBuy");
    if (b) b.onclick = () => { if (Save.buy(h)) { Sound.sfx("buy"); Save.data.selected = h.id; Save.save(); renderSelect(); } };
    $("#btnStart").disabled = !Save.owned(Save.data.selected);
  }

  function endMatch(res) {
    const me = res.players.find((p) => p.isPlayer);
    const mult = { 1: 1, 3: 1.3, 5: 1.6 }[res.mode] || 1;
    const base = res.win ? 100 + me.k * 10 + me.a * 5 : 40 + me.k * 8 + me.a * 4;
    const reward = res.quit ? 0 : Math.round(base * mult);   // v6.7: quitting earns no coins (the quit prompt always said so)
    Save.data.coins += reward;
    Save.data.stats.played++; const xpGain = res.quit ? 0 : (res.win ? 120 : 60) + me.k * 6 + me.a * 3; Save.data.xp = (Save.data.xp || 0) + xpGain; Save.data.stats.kills = (Save.data.stats.kills || 0) + me.k;
    if (res.win) Save.data.stats.wins++;
    Save.save();

    const banner = $("#resBanner");
    banner.textContent = res.win ? "VICTORY" : "DEFEAT";
    $("#resNote").classList.toggle("hidden", !res.quit);
    banner.className = res.win ? "win" : "lose";
    const render = (team) => {
      const rows = res.players.filter((p) => p.team === team).sort((a, b) => b.k - a.k || b.a - a.a);
      return (
        `<div class="row head"><span>Hero</span><span>K/D/A</span><span>Gold</span><span>Dmg</span><span>Taken</span><span>Heal</span><span>Twr</span></div>` +
        rows.map((p) =>
          `<div class="row${p.isPlayer ? " me" : ""}"><span>${p.emoji} ${p.name} <small class="muted">${p.hero}</small>${p.mvp ? `<em class="mvp-tag ${res.win === (team === 0) ? "gold" : "silver"}">${res.win === (team === 0) ? "👑" : "🥈"} MVP</em>` : ""}</span>` +
          `<span>${p.k}/${p.d}/${p.a}</span><span>${p.gold}</span><span>${p.dmg}</span><span>${p.taken}</span><span>${p.heal}</span><span>${p.twr}</span></div>`
        ).join("")
      );
    };
    $("#resBlue").innerHTML = render(0);
    $("#resRed").innerHTML = render(1);
    $("#resCoins").textContent = reward; $("#resXp").textContent = "· +" + xpGain + " XP";
    Battle.stop();
    show("result");
    Sound.silence();
    Sound.sfx(res.win ? "win" : "lose");
  }

  ["pointerdown", "touchend", "click", "keydown"].forEach((ev) => document.addEventListener(ev, () => Sound.init(), { passive: true }));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Sound.ctx && Sound.ctx.state !== "running") { try { Sound.ctx.resume(); } catch (e) {} } });
  $("#btnPlay").onclick = () => { Sound.sfx("click"); show("modes"); };
  $("#dockMode").onclick = () => { Sound.sfx("click"); show("modes"); };
  $("#btnHeroes").onclick = () => { Sound.sfx("click"); openHeroes(true); };
  $("#navHeroes").onclick = () => { Sound.sfx("click"); openHeroes(true, null, "Owned"); };
  $("#navShop").onclick = () => { Sound.sfx("click"); openHeroes(true, "felix", "Shop"); };
  $("#promoFelix").onclick = () => { Sound.sfx("click"); openHeroes(true, "felix", "All"); };
  $("#navHome").onclick = () => { Sound.sfx("click"); show("lobby"); };
  $("#navQuests").onclick = () => { Sound.sfx("click"); openQuests(); };
  $("#dockQuests").onclick = () => { Sound.sfx("click"); openQuests(); };
  $("#dockPrep").onclick = () => { Sound.sfx("click"); openPrep(); };
  $("#lobbyProfile").onclick = () => { Sound.sfx("click"); openPrep(); };
  $("#questsClose").onclick = () => { Sound.sfx("click"); $("#questsModal").classList.add("hidden"); };

  $("#modesBack").onclick = () => { Sound.sfx("click"); show("lobby"); };
  $$(".mode-card").forEach((c) => {
    c.onclick = () => {
      Sound.sfx("click");
      if (c.dataset.mode === "practice") return openPractice();
      mode = +c.dataset.mode; enterFs(); openDraft();
    };
  });


  /* ---------- v7.1 HERO DRAFT (MLBB-style) ----------
     45s pick phase: you choose + SELECT (locked, no changes), allied bots pick for themselves one by one, enemies are drawn from what is left.
     When the timer ends the match starts and the existing 5s "preparing" showcase (battle.js) plays. Practice mode keeps its own picker. */
  const DRAFT_SECS = 45, DRAFT_FAST = 15;   // v7.5: once the whole team has picked, the remaining time is cut down to DRAFT_FAST seconds
  let dr = null;
  const MODE_NAMES = { 1: "Duel · 1 v 1", 3: "Skirmish · 3 v 3", 5: "Classic · 5 v 5" };
  const heroById = (id) => HEROES.find((x) => x.id === id);
  const idleSheet = (h) => (h.sprites && h.sprites.anims && h.sprites.anims.idle ? h.sprites : null);
  const esc2 = (t) => String(t).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

  function drStop() {
    if (!dr) return;
    clearInterval(dr.tick); clearInterval(dr.idle); clearTimeout(dr.go); clearTimeout(dr.toastT);
    dr.dead = true; dr = null;
  }
  function openDraft() {
    drStop();
    const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5);
    const n = Math.max(0, mode - 1), span = 32;
    const bots = [];
    for (let k = 0; k < n; k++) bots.push({ name: names[k], pick: null, at: 3 + ((k + Math.random() * 0.85) * span) / n, fresh: false });
    const owned = HEROES.filter((h) => Save.owned(h.id));
    const first = Save.owned(Save.data.selected) ? Save.data.selected : (owned[0] || HEROES[0]).id;
    dr = { mode, bots, view: first, locked: false, t0: Date.now(), endAt: Date.now() + DRAFT_SECS * 1000, fast: false, lastSec: DRAFT_SECS + 1, ended: false, tick: 0, idle: 0, go: 0, toastT: 0 };
    $("#drMode").textContent = MODE_NAMES[mode] || "";
    $("#drBack").classList.remove("gone");
    $("#drGrid").classList.remove("off");
    $("#drLocked").classList.add("hidden");
    $("#drToast").classList.add("hidden");
    const tm = $("#drTimer"); tm.className = "dr-timer"; tm.style.setProperty("--p", 1); $("#drSec").textContent = DRAFT_SECS;
    drRender();
    show("draft");
    Sound.silence();                       // v7.4: no music on the hero-pick page, only the announcer
    Sound.annReset(); Sound.announce("pick_hero");
    dr.tick = setInterval(drTick, 100);
  }
  const drTaken = () => new Set(dr.bots.filter((b) => b.pick).map((b) => b.pick));
  function drToast(msg) {
    const t = $("#drToast"); t.textContent = msg; t.classList.remove("hidden");
    clearTimeout(dr.toastT); dr.toastT = setTimeout(() => t.classList.add("hidden"), 1800);
  }
  function drRender() { drGrid(); drTeam(); drStage(); drButton(); }
  function drArt(h) { if (!dr) return; drGrid(); drTeam(); if (h.id === dr.view) drStage(); }

  /* right: hero picker */
  function drGrid() {
    const g = $("#drGrid"), keep = g.scrollTop, taken = drTaken();
    g.innerHTML = "";
    HEROES.forEach((h) => {
      const own = Save.owned(h.id), tk = taken.has(h.id);
      const c = document.createElement("div");
      c.className = "dr-card" + (dr.view === h.id ? " sel" : "") + (own ? "" : " locked") + (tk ? " taken" : "");
      c.style.setProperty("--c", h.color);
      c.innerHTML = `<div class="dr-av"></div><small>${esc2(h.name)}</small>`;
      HeroArt.paint(c.querySelector(".dr-av"), h);
      c.onclick = () => drPreview(h);
      g.appendChild(c);
    });
    g.scrollTop = keep;
  }
  function drPreview(h) {
    if (!dr || dr.locked || dr.ended) return;
    if (drTaken().has(h.id)) return;
    Sound.sfx("click"); playVoice(h);
    dr.view = h.id;
    if (!Save.owned(h.id)) drToast("🔒 Not owned yet — unlock it in Heroes & Shop");
    drGrid(); drTeam(); drStage(); drButton();
  }

  /* left: your team */
  function drTeam() {
    const box = $("#drTeam");
    if (Save.owned(dr.view)) dr.lastOwned = dr.view;
    const me = heroById(Save.owned(dr.view) ? dr.view : dr.lastOwned || Save.data.selected);
    box.innerHTML = "";
    const row = (cls, name, hero, sub) => {
      const r = document.createElement("div");
      r.className = "dr-row " + cls;
      r.innerHTML = `<div class="dr-ava">${hero ? "" : "?"}</div><div class="dr-meta"><b>${esc2(name)}</b><small>${sub}</small></div>`;
      if (hero) HeroArt.paint(r.querySelector(".dr-ava"), hero);
      box.appendChild(r);
    };
    row("me" + (dr.locked ? " picked" : ""), "You", me, dr.locked ? `${esc2(me.name)} · Locked` : `${esc2(me.name)}<span class="dr-dots"></span>`);
    dr.bots.forEach((b) => {
      const h = b.pick ? heroById(b.pick) : null;
      row((h ? "picked" : "") + (b.fresh ? " fresh" : ""), b.name, h, h ? `${esc2(h.name)} · ${esc2(h.role)}` : `Picking<span class="dr-dots"></span>`);
    });
  }

  /* centre: big hero - idle sheet when the hero has one, otherwise the circle banner */
  function drStage() {
    const h = heroById(dr.view), box = $("#drHero");
    clearInterval(dr.idle);
    $("#drStage").style.setProperty("--c", h.color);
    box.innerHTML = "";
    box.style.animation = "none"; void box.offsetWidth; box.style.animation = "";
    const circle = () => {
      box.innerHTML = "";
      const c = document.createElement("div"); c.className = "dr-circle" + (h.img ? "" : " noart");
      HeroArt.paint(c, h); box.appendChild(c);
    };
    const sp = idleSheet(h);
    if (sp) {
      const a = sp.anims.idle, rows = Math.ceil(a.frames / a.cols), im = new Image(), id = h.id;
      im.onload = () => {
        if (!dr || dr.view !== id) return;
        const el = document.createElement("div"); el.className = "dr-sprite";
        el.style.backgroundImage = `url('${sp.dir + a.src}')`;
        el.style.backgroundSize = `calc(var(--s) * ${a.cols}) calc(var(--s) * ${rows})`;
        const set = (f) => { el.style.backgroundPosition = `calc(var(--s) * ${-(f % a.cols)}) calc(var(--s) * ${-Math.floor(f / a.cols)})`; };
        set(0); box.innerHTML = ""; box.appendChild(el);
        let f = 0; clearInterval(dr.idle);
        dr.idle = setInterval(() => { f = (f + 1) % a.frames; set(f); }, 1000 / (a.fps || 12));
      };
      im.onerror = () => { if (dr && dr.view === id) circle(); };
      im.src = sp.dir + a.src;
    } else circle();

    $("#drName").textContent = h.name;
    $("#drRole").textContent = `${roleIcon(h.role)} ${h.role}`;
    $("#drQuote").textContent = h.quote ? `\u201C${h.quote}\u201D` : "";
    const skBtn = (s, i, passive) => `<button type="button" class="skb${passive ? " passive" : ""}" data-i="${i}" aria-label="${esc2(s.name)}"><span class="ico">${passive ? RCIcon.passiveHtml(h) : RCIcon.skillHtml(h, i)}</span><small>${passive ? "Passive" : s.cd + "s"}</small></button>`;
    const tips = h.skills.map((s) => ({ name: s.name, cd: s.cd + "s", desc: s.desc }));
    if (h.passive) tips.push({ name: "Passive", cd: "", desc: h.passive });
    const sk = $("#drSkills");
    sk.innerHTML = h.skills.map((s, i) => skBtn(s, i, false)).join("") + (h.passive ? skBtn({ icon: "✨", name: "Passive" }, h.skills.length, true) : "");
    bindSkillTips(sk, tips);
  }
  function drButton() {
    const b = $("#drSelect"), h = heroById(dr.view), own = Save.owned(h.id);
    b.classList.toggle("locked", dr.locked);
    b.disabled = dr.locked || !own;
    b.textContent = dr.locked ? "✔ LOCKED" : own ? "SELECT" : "🔒 NOT OWNED";
  }

  /* allied bots pick for themselves: never the hero you are looking at, never your last free owned hero, prefer roles the team lacks */
  function drBotPick(b) {
    const taken = drTaken(), freeOwned = HEROES.filter((h) => Save.owned(h.id) && !taken.has(h.id));
    let pool = HEROES.filter((h) => !taken.has(h.id) && h.id !== dr.view);
    if (freeOwned.length <= 1) pool = pool.filter((h) => !Save.owned(h.id));
    if (!pool.length) return;
    const have = new Set(dr.bots.filter((x) => x.pick).map((x) => heroById(x.pick).role.split(" ")[0]));
    const fresh = pool.filter((h) => !have.has(h.role.split(" ")[0]));
    const list = fresh.length ? fresh : pool;
    b.pick = list[Math.floor(Math.random() * list.length)].id;
    b.fresh = true; setTimeout(() => { b.fresh = false; }, 700);
    Sound.sfx("click");
  }

  function drLock(auto) {
    if (!dr || dr.locked) return;
    let h = heroById(dr.view);
    const taken = drTaken(), ok = (x) => Save.owned(x.id) && !taken.has(x.id);
    if (!ok(h)) h = heroById(Save.data.selected);
    if (!h || !ok(h)) h = HEROES.find(ok);
    if (!h) return;
    dr.view = h.id; dr.locked = true;
    Save.data.selected = h.id; Save.save();
    $("#drBack").classList.add("gone");
    $("#drGrid").classList.add("off");
    $("#drLocked").classList.remove("hidden");
    Sound.sfx("buy"); if (!auto) playVoice(h);
    drRender();
  }

  function drTick() {
    if (!dr || dr.ended) return;
    const now = Date.now(), el = (now - dr.t0) / 1000;
    // v7.5: you are locked in and every ally has picked -> do not wait out the rest of the 45s: compress it to 15s (never lengthens it)
    if (!dr.fast && dr.locked && dr.bots.every((b) => b.pick)) { dr.fast = true; dr.endAt = Math.min(dr.endAt, now + DRAFT_FAST * 1000); }
    const left = Math.max(0, (dr.endAt - now) / 1000), sec = Math.ceil(left);
    const tm = $("#drTimer");
    tm.style.setProperty("--p", left / DRAFT_SECS);
    $("#drSec").textContent = sec;
    tm.classList.toggle("last", left <= DRAFT_FAST);   // v7.5: final 15s = red number
    tm.classList.toggle("low", left <= 5);
    if (sec !== dr.lastSec) { dr.lastSec = sec; if (sec <= 5 && sec > 0) Sound.sfx("click"); }
    let changed = false;
    dr.bots.forEach((b) => { if (!b.pick && el >= b.at) { drBotPick(b); changed = true; } });
    if (changed) { drGrid(); drTeam(); }
    if (left <= 0) drFinish();
  }

  /* timer over: lock whatever is still open, draw the enemy team from the heroes left, then hand over to the battle's "preparing" screen */
  function drFinish() {
    dr.ended = true; clearInterval(dr.tick);
    dr.bots.forEach((b) => { if (!b.pick) drBotPick(b); });
    drLock(true);
    const tm = $("#drTimer"); tm.classList.remove("low", "last"); tm.classList.add("done");
    $("#drSec").textContent = "0"; $("#drMode").textContent = "Preparing battle…";
    $("#drBack").classList.add("gone");
    drRender();
    const taken = drTaken(); taken.add(Save.data.selected);
    const left = HEROES.filter((h) => !taken.has(h.id)).sort(() => Math.random() - 0.5);
    const enemies = [];
    for (let i = 0; i < dr.mode; i++) enemies.push((left[i] || HEROES.filter((h) => h.id !== Save.data.selected)[i % (HEROES.length - 1)]).id);
    const picks = { allies: dr.bots.map((b) => b.pick), allyNames: dr.bots.map((b) => b.name), enemies };
    const m = dr.mode;
    dr.go = setTimeout(() => {
      drStop();
      show("battle"); Sound.startMusic("battle");
      Battle.start(m, Save.data.selected, endMatch, { picks });
    }, 1100);
  }
  $("#drSelect").onclick = () => { if (dr && !dr.ended) drLock(false); };
  $("#drBack").onclick = () => { if (!dr || dr.locked || dr.ended) return; Sound.sfx("click"); Sound.annReset(); show("modes"); Sound.startMusic("lobby"); };

  /* ---------- v5.1 PRACTICE SETUP (1v1 training; every hero is selectable, nothing is earned or saved to stats) ---------- */
  let prac = null;
  function pracLoad() {
    const sv = Save.data.practice || {}, ids = HEROES.map((h) => h.id);
    const me = ids.includes(sv.me) ? sv.me : ids.includes(Save.data.selected) ? Save.data.selected : ids[0];
    const en = ids.includes(sv.en) ? sv.en : ids.find((id) => id !== me);
    const lv = (v) => Math.min(15, Math.max(1, Math.round(+v) || 1));
    prac = { me, en, myLv: lv(sv.myLv), enemyLv: lv(sv.enemyLv), freezeEnemy: !!sv.freezeEnemy, noCdMe: !!sv.noCdMe, noCdEnemy: !!sv.noCdEnemy, minions: !!sv.minions, dummy: !!sv.dummy };
  }
  function pracSave() { Save.data.practice = Object.assign({}, prac); Save.save(); }
  function renderPractice() {
    [["#psMeGrid", "me"], ["#psEnGrid", "en"]].forEach(([sel, key]) => {
      const g = $(sel); g.innerHTML = "";
      HEROES.forEach((h) => {
        const el = document.createElement("div");
        el.className = "ps-chip" + (prac[key] === h.id ? " sel" : "");
        el.innerHTML = `<div class="ava" style="background-color:${h.color}33;border-color:${h.color}"></div><small>${h.name}</small>`;
        setAvatar(el.querySelector(".ava"), h);
        el.onclick = () => { Sound.sfx("click"); prac[key] = h.id; renderPractice(); };
        g.appendChild(el);
      });
    });
    $("#psLvMe").textContent = prac.myLv; $("#psLvEn").textContent = prac.enemyLv;
    $$("#practice .ps-tg").forEach((b) => {
      const on = !!prac[b.dataset.ps]; b.classList.toggle("on", on); b.querySelector("em").textContent = on ? "ON" : "OFF";
    });
  }
  function openPractice() { pracLoad(); renderPractice(); show("practice"); }
  $$("#practice [data-ps]").forEach((b) => {
    b.onclick = () => {
      Sound.sfx("click");
      const k = b.dataset.ps, m = /^lv-(me|en)-(up|down|max)$/.exec(k);
      if (m) {
        const f = m[1] === "me" ? "myLv" : "enemyLv";
        prac[f] = m[2] === "max" ? 15 : Math.min(15, Math.max(1, prac[f] + (m[2] === "up" ? 1 : -1)));
      } else prac[k] = !prac[k];
      renderPractice();
    };
  });
  $("#prMaxBoth").onclick = () => { Sound.sfx("click"); prac.myLv = prac.enemyLv = 15; renderPractice(); };
  $("#prBack").onclick = () => { Sound.sfx("click"); pracSave(); show("modes"); };
  $("#prStart").onclick = () => {
    Sound.sfx("click"); pracSave(); enterFs();
    show("battle"); Sound.startMusic("battle");
    Battle.start(1, prac.me, endMatch, { practice: true, enemyHero: prac.en, myLv: prac.myLv, enemyLv: prac.enemyLv,
      freezeEnemy: prac.freezeEnemy, noCdMe: prac.noCdMe, noCdEnemy: prac.noCdEnemy, minions: prac.minions, dummy: prac.dummy });
  };
  $("#selBack").onclick = () => { Sound.sfx("click"); shopMode ? toLobby() : show("modes"); };
  $("#btnStart").onclick = () => {
    if (!Save.owned(Save.data.selected)) return;
    Sound.sfx("click");
    enterFs();
    show("battle");
    Sound.startMusic("battle");
    Battle.start(mode, Save.data.selected, endMatch);
  };
  $("#btnBackLobby").onclick = () => { Sound.sfx("click"); toLobby(); };

  $("#tglSfx").onclick = toggleSfx;
  $("#tglMusic").onclick = toggleMusic;
  $("#tglFs").onclick = toggleFs;
  $("#btnBattleFs").onclick = toggleFs;
  $("#pFs").onclick = toggleFs;
  $("#pSfx").onclick = toggleSfx;
  $("#pMusic").onclick = toggleMusic;

  $("#btnPause").onclick = () => {
    $("#battleShopModal").classList.add("hidden");
    Battle.pause(true);
    $("#quitConfirm").classList.add("hidden");
    $("#pCtrlBox").classList.add("hidden");
    $("#pauseMenu").classList.remove("hidden");
  };
  $("#pResume").onclick = () => { Battle.pause(false); $("#pauseMenu").classList.add("hidden"); };
  $("#pCtrl").onclick = () => $("#pCtrlBox").classList.toggle("hidden");
  $("#pGfx").onclick = () => {
    const low = Battle.toggleGfx();
    $("#pGfx").textContent = "✨ Graphics: " + (low ? "Low" : "High");
  };
  $("#pQuit").onclick = () => $("#quitConfirm").classList.remove("hidden");
  $("#pQuitNo").onclick = () => $("#quitConfirm").classList.add("hidden");
  $("#pQuitYes").onclick = () => {   // v6.7: quitting shows the scoreboard as a DEFEAT (practice has no scoreboard: straight back to the lobby)
    $("#pauseMenu").classList.add("hidden"); $("#quitConfirm").classList.add("hidden");
    if (!Battle.forfeit()) toLobby();
  };

  HEROES.forEach((h) => HeroArt.resolve(h, onArt));
  Battle.initControls();
  lobby();
  Sound.startMusic("lobby");

})();

