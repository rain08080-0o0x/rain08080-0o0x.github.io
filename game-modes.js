(() => {
  "use strict";
  const modes = {
    bugs: ["BUG BUSTER", "カーソル／タップ位置へ自動射撃 · 文字も破壊可能 · ウェーブを突破して強化", "Destructible type / wave survival"],
  };
  const $ = (s, root = document) => root.querySelector(s);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const tau = Math.PI * 2;
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const menu = document.createElement("aside");
  menu.className = "game-menu";
  menu.innerHTML = `<button type="button" aria-label="作品・ゲームメニュー" aria-expanded="false" aria-controls="game-menu-panel">⋯</button>
    <div id="game-menu-panel" class="game-menu-panel" hidden><div data-menu-view="works"><p>PROJECTS</p><nav aria-label="作品一覧"><ul class="game-project-links"></ul></nav><button type="button" data-action="show-games">ゲームとして遊ぶ →</button></div><div data-menu-view="games" hidden><p>PLAYGROUND</p><button type="button" data-action="show-works">← 作品一覧</button><details open><summary>ゲームモード</summary><ul>
    <li><button data-game="bugs">Bug Buster<small>ROGUELIKE / TYPE BREAKER</small></button></li>
    </ul></details><button type="button" data-action="sound" aria-pressed="true">SE: ON</button></div></div>`;
  document.querySelectorAll("a.work-card").forEach(card => {
    const title = $("h3", card).cloneNode(true);
    title.querySelectorAll(".work-award").forEach(badge => badge.remove());
    const item = document.createElement("li"), link = document.createElement("a");
    link.href = card.getAttribute("href"); link.textContent = title.textContent.trim();
    item.append(link); $(".game-project-links", menu).append(item);
  });
  const session = document.createElement("section");
  session.className = "game-session"; session.hidden = true;
  session.setAttribute("role", "dialog"); session.setAttribute("aria-modal", "true"); session.setAttribute("aria-labelledby", "game-title");
  session.innerHTML = `<canvas aria-label="ゲーム操作エリア" tabindex="0"></canvas>
    <div class="game-bar"><h2 id="game-title"></h2><output class="game-status" aria-live="polite"></output><button data-action="restart">↻ 再スタート</button><button data-action="exit">終了 ×</button></div>
    <div class="game-upgrades" hidden><p>WAVE CLEAR</p><h3>次のウェーブへ向けて強化</h3><button data-upgrade="power">威力 +1<small>硬いバグを少ない弾で破壊</small></button><button data-upgrade="rate">連射速度 +50%<small>自動連射の間隔を短縮</small></button><button data-upgrade="spread">拡散 +2発<small>扇状に弾を発射</small></button><button data-upgrade="chain">伝播対象 +1・範囲 +20px<small>初期120pxから拡大。最寄りの敵へ順番に伝播</small></button><button data-upgrade="chainDamage">伝播ダメージ +1<small>伝播で与えるダメージを増加</small></button><button data-upgrade="pierce">貫通回数 +1<small>敵に当たっても先へ進む</small></button><button data-upgrade="split">分裂確率 +5ポイント<small>敵への命中時に分裂。初期2発・再分裂なし</small></button><button data-upgrade="splitCount">分裂数 +2発<small>分裂時の弾を増加。全体の角度は最大120度</small></button><button data-upgrade="haste">命中加速の上限 +60ポイント<small>1ヒットで上限の1/20上昇。未命中1秒ごとに1ポイント減衰</small></button><button data-action="reroll">候補を引き直す（残り3回）</button></div>
    <div class="game-help"></div>`;
  // ポーズ画面: 三点リーダー以外をグレーアウトし、前面に PAUSE と Continue を表示
  const pauseLayer = document.createElement("div");
  pauseLayer.className = "game-pause"; pauseLayer.hidden = true;
  pauseLayer.setAttribute("role", "dialog"); pauseLayer.setAttribute("aria-modal", "true"); pauseLayer.setAttribute("aria-label", "ポーズ中");
  pauseLayer.innerHTML = `<aside class="game-pause-stats" aria-label="現在の強化ステータス" hidden><p>UPGRADE STATUS</p><h3>強化ステータス</h3><table><thead><tr><th>強化名</th><th>取得回数</th><th>数値</th></tr></thead><tbody></tbody></table></aside><h2 class="game-pause-title" aria-label="Pause">${[..."PAUSE"].map((c, i) => `<span aria-hidden="true" style="--i:${i}">${c}</span>`).join("")}</h2><button type="button" class="game-pause-continue">Continue</button>`;
  document.body.append(menu, session, pauseLayer);
  const continueButton = $(".game-pause-continue", pauseLayer), pauseStats = $(".game-pause-stats", pauseLayer), pauseStatsBody = $("tbody", pauseStats);
  const pauseColumns = document.createElement("div");
  pauseColumns.className = "game-pause-columns";
  pauseColumns.append(pauseStats); pauseLayer.append(pauseColumns);
  const toggle = $("button", menu), panel = $(".game-menu-panel", menu);
  const canvas = $("canvas", session), ctx = canvas.getContext("2d");
  const upgradePanel = $(".game-upgrades", session), status = $("output", session);
  const topProgressBar = $(".scroll-progress i");
  function syncWaveProgress() {
    if (!topProgressBar) return;
    if (mode === "bugs" && run) {
      const resolved = run.spawnTotal - run.toSpawn - enemies.filter(e => !e.dead).length;
      topProgressBar.style.setProperty("--p", run.choosing ? 1 : clamp(resolved / Math.max(1, run.spawnTotal), 0, 1));
    } else {
      const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      topProgressBar.style.setProperty("--p", clamp(window.scrollY / max, 0, 1));
    }
  }
  let mode = null, frame = 0, last = 0, elapsed = 0, accumulator = 0, w = 0, h = 0, top = 0, floor = 0;
  let bodies = [], letters = [], particles = [], bullets = [], enemies = [], wrappers = [], inertNodes = [];
  const ENEMY_MIN_DIST = .72; // 敵同士の最小距離率(半径合計の72%までは少しめり込みを許容し、それ以上で押し出す)
  let enemyId = 0;
  let pointer = null, ship = null, run = null, done = false, savedScroll = 0;
  let loading = false, generation = 0;
  const soundButton = $('[data-action="sound"]', menu);
  let soundEnabled = true, audioContext = null, audioGain = null;
  const voices = new Set(), lastSounds = new Map();
  const tones = {
    start: [330, 660, .16, "sine"], shot: [950, 180, .055, "square"],
    hit: [210, 90, .06, "triangle"], kill: [420, 70, .13, "sawtooth"],
    letter: [1600, 500, .045, "triangle"], hurt: [130, 45, .18, "sawtooth"],
    clear: [520, 1040, .28, "sine"], upgrade: [600, 1200, .12, "triangle"],
    reroll: [400, 750, .08, "sine"], defeat: [220, 40, .4, "triangle"]
  };
  function prepareAudio() {
    if (!soundEnabled) return;
    try {
      if (!audioContext) { audioContext = new AudioContext(); audioGain = audioContext.createGain(); audioGain.gain.value = .14; audioGain.connect(audioContext.destination); }
      if (audioContext.state === "suspended") audioContext.resume().catch(disableAudio);
    } catch { disableAudio(); }
  }
  function disableAudio() {
    soundEnabled = false; silence(); soundButton.textContent = "SE: 利用不可"; soundButton.disabled = true; soundButton.setAttribute("aria-pressed", "false");
  }
  function silence() {
    voices.forEach(voice => { voice.oscillator.stop(); voice.oscillator.disconnect(); voice.gain.disconnect(); });
    voices.clear(); lastSounds.clear();
  }
  function playSound(name) {
    if (!soundEnabled || !mode || document.hidden || audioContext?.state !== "running" || voices.size >= 12) return;
    const now = audioContext.currentTime;
    if (now - (lastSounds.get(name) ?? -1) < .04) return;
    lastSounds.set(name, now);
    const [from, to, duration, type] = tones[name], oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(from, now); oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(.12, now + .004); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(audioGain);
    const voice = { oscillator, gain }; voices.add(voice);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); voices.delete(voice); };
    oscillator.start(now); oscillator.stop(now + duration + .01);
  }
  activate(soundButton, () => {
    soundEnabled = !soundEnabled; soundButton.textContent = `SE: ${soundEnabled ? "ON" : "OFF"}`; soundButton.setAttribute("aria-pressed", String(soundEnabled));
    if (soundEnabled) { prepareAudio(); playSound("upgrade"); } else silence();
  });
  function activate(button, action) {
    button.addEventListener("click", action);
  }
  // 三点リーダーメニュー (開閉アニメーション付き)。開閉状態は menuOpen で管理する
  let menuOpen = false, menuCloseTimer = 0;
  function showMenu(open) {
    clearTimeout(menuCloseTimer);
    menuOpen = open; toggle.setAttribute("aria-expanded", String(open));
    if (open) {
      const origin = toggle.getBoundingClientRect();
      panel.hidden = false; panel.classList.remove("is-closing", "is-opening");
      toggle.classList.remove("is-kick", "is-returning");
      const target = panel.getBoundingClientRect();
      panel.style.setProperty("--menu-scale-x", String(origin.width ? origin.width / target.width : .8));
      panel.style.setProperty("--menu-scale-y", String(origin.height ? origin.height / target.height : .8));
      panel.style.setProperty("--menu-shift-x", `${origin.width ? origin.right - target.right : 0}px`);
      panel.style.setProperty("--menu-shift-y", `${origin.height ? origin.top - target.top : 0}px`);
      replayClass(panel, "is-opening"); replayClass(toggle, "is-returning");
      animateMenuItems(.48);
    }
    else if (!panel.hidden) {
      if (viewAnimations.length) showMenuView(activeMenuView);
      panel.classList.remove("is-opening"); panel.classList.add("is-closing");
      menuCloseTimer = setTimeout(() => { panel.hidden = true; panel.classList.remove("is-closing"); }, reduced ? 0 : 200);
    }
  }
  // ポーズ状態: running → opening(演出中) → paused → closing(演出中) → running
  // 演出中は入力を受け付けず、多重判定を防ぐ
  let pauseState = "running", pauseTimer = 0;
  const PAUSE_IN_MS = reduced ? 0 : 760, PAUSE_OUT_MS = reduced ? 0 : 460;
  function renderPauseStats() {
    if (mode !== "bugs" || !run) { pauseStats.hidden = true; return; }
    pauseStats.hidden = false;
    const picks = run.picks || {};
    const rows = [
      ["威力", picks.power || 0, `${run.power}`],
      ["連射速度", picks.rate || 0, `${(1 / run.interval).toFixed(2)} 発/s`],
      ["拡散", picks.spread || 0, `${run.spread} 発`],
      ["伝播対象・範囲", picks.chain || 0, run.chain > 0 ? `${run.chain}体 / ${120 + run.chain * 20}px` : "0体 / 120px"],
      ["伝播ダメージ", picks.chainDamage || 0, `${run.chainDamage}`],
      ["貫通回数", picks.pierce || 0, `${run.pierce} 回`],
      ["分裂確率", picks.split || 0, `${Math.round(run.splitChance * 100)}%`],
      ["分裂数", picks.splitCount || 0, `${run.splitCount} 発`],
      ["命中加速上限", picks.haste || 0, `${Math.round(run.hasteMax * 100)}%`]
    ];
    pauseStatsBody.innerHTML = rows.map(([name, count, val], i) => `<tr class="${count > 0 ? "is-upgraded" : ""}" style="--k:${i}"><td>${name}</td><td>${count}回</td><td>${val}</td></tr>`).join("");
  }
  function pauseGame() {
    if (!mode || loading || pauseState !== "running") return;
    pauseState = "opening";
    // 1. まずゲームを止める(このフレームの画面のまま固まる)
    pointer = null; silence();
    session.inert = true;
    renderPauseStats();
    showMenuView("games");
    pauseColumns.append(menu);
    showMenu(true);
    requestAnimationFrame(() => {
      if (pauseState !== "opening") return;
      // 2. 固まった直後に即グレーアウト
      pauseLayer.hidden = false; pauseLayer.className = "game-pause is-gray";
      // 3. そこから PAUSE / Continue / 強化ステータス をアニメーションで登場
      requestAnimationFrame(() => { if (pauseState === "opening") pauseLayer.classList.add("is-in"); });
      pauseTimer = setTimeout(() => {
        if (pauseState !== "opening") return;
        pauseState = "paused"; pauseLayer.classList.add("is-ready"); continueButton.focus({ preventScroll: true });
      }, PAUSE_IN_MS);
    });
  }
  function resumeGame() {
    if (pauseState !== "paused") return;
    pauseState = "closing";
    showMenu(false);
    pauseLayer.classList.add("is-out");
    pauseTimer = setTimeout(() => {
      if (pauseState !== "closing") return;
      resetPause(); last = performance.now(); canvas.focus({ preventScroll: true });
    }, PAUSE_OUT_MS);
  }
  function resetPause() {
    clearTimeout(pauseTimer); pauseState = "running";
    document.body.append(menu);
    pauseLayer.hidden = true; pauseLayer.className = "game-pause"; session.inert = false;
  }
  activate(continueButton, resumeGame);
  let viewAnimations = [], viewVersion = 0, activeMenuView = "works";
  function showMenuView(view, transition = false) {
    activeMenuView = view;
    const version = ++viewVersion;
    const previousHeight = panel.offsetHeight;
    viewAnimations.forEach(animation => animation.cancel()); viewAnimations = [];
    panel.classList.remove("is-view-transition");
    const outgoing = menu.querySelector("[data-menu-view]:not([hidden])");
    const incoming = menu.querySelector(`[data-menu-view="${view}"]`);
    menu.querySelectorAll("[data-menu-view]").forEach(node => { node.hidden = node !== incoming; node.inert = false; });
    panel.scrollTop = 0;
    if (!transition || reduced || outgoing === incoming) { animateMenuItems(); return; }
    const nextHeight = panel.offsetHeight;
    outgoing.hidden = false; outgoing.inert = incoming.inert = true;
    panel.classList.add("is-view-transition");
    const direction = view === "games" ? 1 : -1;
    const options = { easing: "cubic-bezier(.16,1,.3,1)", fill: "both" };
    viewAnimations = [
      panel.animate([{ height: `${previousHeight}px` }, { height: `${nextHeight}px` }], { ...options, delay: 140, duration: 360 }),
      outgoing.animate([{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${-direction * 100}%)`, opacity: 0 }], { ...options, duration: 140 }),
      incoming.animate([{ transform: `translateX(${direction * 100}%)`, opacity: 0 }, { transform: "translateX(0)", opacity: 1 }], { ...options, delay: 500, duration: 220 })
    ];
    Promise.all(viewAnimations.map(animation => animation.finished)).then(() => {
      if (version !== viewVersion) return;
      outgoing.hidden = true; incoming.inert = false;
      viewAnimations.forEach(animation => animation.cancel()); viewAnimations = [];
      panel.classList.remove("is-view-transition");
      incoming.querySelector("a,button").focus({ preventScroll: true });
    }).catch(error => { if (error.name !== "AbortError") throw error; });
  }
  function animateMenuItems(delay = 0) {
    const view = menu.querySelector("[data-menu-view]:not([hidden])");
    view.style.setProperty("--menu-items-delay", `${delay}s`);
    view.querySelectorAll("li,summary,:scope > button").forEach((item, index) => {
      item.style.setProperty("--menu-item-index", index); replayClass(item, "is-menu-entering");
    });
  }
  activate($('[data-action="show-games"]', menu), () => showMenuView("games", true));
  activate($('[data-action="show-works"]', menu), () => showMenuView("works", true));
  activate(toggle, () => {
    if (mode) { if (pauseState === "running") pauseGame(); else resumeGame(); }
    else { if (!menuOpen) showMenuView("works"); showMenu(!menuOpen); }
  });
  document.addEventListener("pointerdown", e => { if (pauseState === "running" && menuOpen && !menu.contains(e.target)) showMenu(false); });
  menu.querySelectorAll("[data-game]").forEach(button => activate(button, () => start(button.dataset.game)));
  activate($('[data-action="exit"]', session), stop);
  activate($('[data-action="restart"]', session), () => start(mode));
  // 強化UIの演出中ロック: 演出が終わるまで全ボタンの入力(クリック・タップ・キーボード)を受け付けない
  const UI_PICK_MS = reduced ? 120 : 620, UI_REROLL_MS = reduced ? 80 : 360;
  function lockUpgradeUI(ms, after) {
    const token = generation, owner = run;
    run.uiLocked = true; upgradePanel.inert = true; upgradePanel.classList.add("is-locked");
    setTimeout(() => {
      if (token !== generation || owner !== run) return; // 終了・リスタート済みなら何もしない
      run.uiLocked = false; upgradePanel.inert = false; upgradePanel.classList.remove("is-locked");
      after();
    }, ms);
  }
  function replayClass(el, name) { el.classList.remove(name); void el.offsetWidth; el.classList.add(name); }
  activate($('[data-action="reroll"]', upgradePanel), () => {
    if (!run?.choosing || run.uiLocked || run.rerolls === 0) return;
    run.rerolls--; playSound("reroll");
    upgradePanel.querySelectorAll("[data-upgrade]:not([hidden])").forEach(b => b.classList.add("is-leaving"));
    replayClass($('[data-action="reroll"]', upgradePanel), "is-pressed");
    lockUpgradeUI(UI_REROLL_MS, showUpgrades);
  });
  upgradePanel.querySelectorAll("[data-upgrade]").forEach(button => activate(button, () => {
    if (!run?.choosing || run.uiLocked || button.hidden) return;
    const choice = button.dataset.upgrade, multiplier = Number(button.dataset.multiplier);
    run.picks[choice] = (run.picks[choice] || 0) + 1;
    if (choice === "power") run.power += multiplier;
    if (choice === "rate") run.interval /= 1 + .5 * multiplier;
    if (choice === "spread") run.spread += 2 * multiplier;
    if (choice === "chain") run.chain += multiplier;
    if (choice === "chainDamage") run.chainDamage += multiplier;
    if (choice === "pierce") run.pierce += multiplier;
    if (choice === "split") run.splitChance = Math.min(1, run.splitChance + .05 * multiplier);
    if (choice === "splitCount") run.splitCount += 2 * multiplier;
    if (choice === "haste") run.hasteMax += .60 * multiplier;
    playSound("upgrade"); run.rewardsRemaining--;
    // 演出: 選んだカードが跳ねて光り、他の候補は退場。パネル全体も小さく弾む
    upgradePanel.querySelectorAll("[data-upgrade]:not([hidden])").forEach(b => b.classList.toggle("is-leaving", b !== button));
    replayClass(button, "is-picked"); replayClass(upgradePanel, "is-bump");
    lockUpgradeUI(UI_PICK_MS, () => {
      if (run.rewardsRemaining > 0) showUpgrades();
      else { run.wave++; beginWave(); canvas.focus(); }
    });
  }));
  function restoreScene() {
    upgradePanel.classList.remove("is-revealing");
    wrappers.forEach(({ wrapper, original }) => wrapper.replaceWith(original)); wrappers = [];
    bodies = []; letters = []; heat = null; pointer = null;
  }
  function stop() {
    silence();
    generation++; cancelAnimationFrame(frame); frame = 0; restoreScene(); mode = null; loading = false; resetPause();
    session.hidden = true; upgradePanel.hidden = true; upgradePanel.inert = false; upgradePanel.classList.remove("is-locked");
    document.body.classList.remove("game-playing"); document.documentElement.classList.remove("game-scroll");
    inertNodes.forEach(([node, inert]) => { node.inert = inert; }); inertNodes = [];
    window.scrollTo({ top: savedScroll, behavior: "instant" }); syncWaveProgress(); showMenu(false); toggle.focus({ preventScroll: true });
  }
  function dimensions() {
    w = session.clientWidth; h = session.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    top = $(".game-bar", session).getBoundingClientRect().bottom + 16;
    floor = $(".game-help", session).getBoundingClientRect().top - 12;
  }
  async function start(next) {
    if (!ctx || !modes[next]) return;
    silence(); prepareAudio();
    const token = ++generation;
    if (!mode) {
      savedScroll = window.scrollY;
      inertNodes = [...document.body.children].filter(n => n instanceof HTMLElement && n !== menu && n !== session && n !== pauseLayer && !n.classList.contains("scroll-progress") && !["SCRIPT", "LINK"].includes(n.tagName)).map(n => [n, n.inert]);
      inertNodes.forEach(([node]) => { node.inert = true; });
    }
    cancelAnimationFrame(frame); restoreScene(); resetPause();
    mode = next; loading = true; done = false; session.hidden = false; session.dataset.mode = mode;
    upgradePanel.hidden = true; showMenu(false); document.body.classList.add("game-playing"); document.documentElement.classList.add("game-scroll");
    $("h2", session).textContent = modes[mode][0];
    const help = $(".game-help", session); help.textContent = modes[mode][1];
    const tech = document.createElement("span"); tech.textContent = `${modes[mode][2]} · ESC: ポーズ`; help.append(tech);
    status.textContent = "PREPARING…";
    window.scrollTo({ top: savedScroll, behavior: "instant" });
    await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(resolve));
    if (token !== generation) return;
    dimensions(); elapsed = accumulator = 0;
    particles = []; bullets = []; enemies = []; run = ship = null;
    if (mode === "bugs") { ship = { x: w / 2, y: floor - 14 }; run = { wave: 1, kills: 0, health: 100, power: 1, interval: .24, spread: 1, cooldown: 0, choosing: false, broken: 0, chain: 0, chainDamage: 1, pierce: 0, splitChance: 0, splitCount: 2, hasteMax: 0, haste: 0, idleHitTime: 0, picks: {} }; beginWave(); }
    if (mode === "bugs") { updateStatus(); dimensions(); ship.y = floor - 14; captureLetters(); prepareHeat(); }
    loading = false; playSound("start"); updateStatus(); dimensions(); canvas.focus({ preventScroll: true }); last = performance.now(); frame = requestAnimationFrame(loop);
  }
  function clippedRect(rect, node) {
    let left = rect.left, right = rect.right, topEdge = rect.top, bottom = rect.bottom;
    for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const style = getComputedStyle(parent), clipX = style.overflowX !== "visible", clipY = style.overflowY !== "visible";
      if (!clipX && !clipY) continue;
      const r = parent.getBoundingClientRect();
      if (clipX) { left = Math.max(left, r.left); right = Math.min(right, r.right); }
      if (clipY) { topEdge = Math.max(topEdge, r.top); bottom = Math.min(bottom, r.bottom); }
    }
    return { left, right, top: topEdge, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - topEdge) };
  }
  function captureLetters() {
    const walker = document.createTreeWalker($("main"), NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent.trim() || parent.closest("script,style,svg,.marquee,.hero-hud,.section-bg-num,.scroll-cue")) continue;
      const r = parent.getBoundingClientRect(), style = getComputedStyle(parent);
      const heatText = mode === "bugs" && parent.closest(".hero-title em") && /[熱量]/u.test(node.textContent);
      if (!r.width || !r.height || style.visibility === "hidden" || (!heatText && (r.bottom < top || r.top > floor))) continue;
      nodes.push(node);
    }
    const measured = [];
    nodes.forEach(original => {
      const segments = [...segmenter.segment(original.textContent)];
        const wrapper = document.createElement("span"); wrapper.className = "game-text-wrap";
        segments.forEach(({ segment }) => {
          if (/^\s+$/.test(segment)) { wrapper.append(document.createTextNode(segment)); return; }
          const element = document.createElement("span"); element.className = "game-letter"; element.textContent = segment; wrapper.append(element);
          measured.push({ text: segment, element, rect: () => element.getBoundingClientRect() });
        });
        original.replaceWith(wrapper); wrappers.push({ original, wrapper });
    });
    measured.forEach(item => {
      const r = clippedRect(item.rect(), item.element), style = getComputedStyle(item.element), size = parseFloat(style.fontSize);
      const heatText = mode === "bugs" && item.element.closest(".hero-title em") && ["熱", "量"].includes(item.text);
      if (!r.width || !r.height || (!heatText && (r.right < 0 || r.left > w || (r.top < top || r.bottom > floor)))) return;
      const color = style.color === "rgba(0, 0, 0, 0)" || style.color === "transparent" ? "#ff9a3d" : style.color;
      letters.push({ text: item.text, element: item.element, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: Math.min(r.height, size * 1.1), font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, color, broken: false });
    });
  }
  function makeBody(x, y, width, height) {
    return { x, y, w: Math.max(2, width), h: Math.max(2, height), vx: rand(-35, 35), vy: 0, angle: 0, omega: rand(-1, 1) };
  }
  function burst(x, y, color, count = 20) {
    for (let i = 0; i < (reduced ? 4 : count); i++) { const a = rand(0, tau), speed = rand(40, 200); particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(.25, .7), color }); }
  }
  function beginWave() {
    run.choosing = false; run.uiLocked = false; upgradePanel.inert = false;
    upgradePanel.classList.remove("is-locked", "is-bump", "is-open");
    run.spawnTotal = maxSpawnCount(run.wave);
    const fiveWaves = Math.floor(run.wave / 5);
    const hpStage = Math.floor((run.wave - 1) / 10);
    run.eliteCount = Math.floor((run.wave - 1) / 5); // 精鋭出現数
    run.normalCount = run.spawnTotal - run.eliteCount;
    const hp = waveMaxHp(run.wave);
    run.normalHp = hp.normal - (hpStage > 0 ? 2 : 0);
    run.upgradedCount = hpStage === 0 ? 0 : Math.round(run.normalCount * ((run.wave - 1) % 10 + 1) / 10);
    run.eliteBaseHp = hp.elite - Math.max(0, run.eliteCount - 1) * 2;
    // 5ウェーブごとに準精鋭(現在精鋭の最大HPの半分)の出現確率が5%ずつ上昇 (100ウェーブで100%)
    run.subEliteChance = Math.min(1, fiveWaves * .05);
    // 精鋭の出現タイミング: 最大敵数 / 精鋭出現数 ごとに1体出現
    run.eliteIndices = new Map();
    if (run.eliteCount > 0) {
      const step = run.spawnTotal / run.eliteCount;
      for (let k = 0; k < run.eliteCount; k++) {
        let idx = Math.min(run.spawnTotal - 1, Math.round((k + 1) * step) - 1);
        while (run.eliteIndices.has(idx) && idx > 0) idx--;
        run.eliteIndices.set(idx, k); // 出現順によるHP差は従来の2倍
      }
    }
    run.normalSpawned = 0;
    run.toSpawn = run.spawnTotal; run.spawnElapsed = 0; run.timedSpawned = 0;
    run.cooldown = 0; upgradePanel.hidden = true; bullets = [];
    syncWaveProgress();
  }
  function maxSpawnCount(wave) {
    const progress = (Math.min(wave, 20) - 1) / 19;
    return Math.floor(20 + 8980 * progress ** 2);
  }
  function baseMaxHp(wave) {
    const five = Math.floor(wave / 5), ten = Math.floor(wave / 10);
    const stage = Math.floor((wave - 1) / 10), elites = Math.floor((wave - 1) / 5);
    const bonus = Math.max(0, Math.floor((wave - 20) / 2));
    return {
      normal: 2 * (Math.max(1, stage) + five + ten * 2 + (stage > 0 ? 1 : 0)) + bonus,
      elite: 2 * (1 + Math.floor((wave - 1) / 2) + five + ten * 10 + (ten >= 2 ? ten * 10 : 0) + Math.max(0, elites - 1)) + bonus * 2
    };
  }
  function waveMaxHp(wave) {
    const hp = baseMaxHp(wave);
    if (wave < 30) return hp;
    let anchor = baseMaxHp(20);
    for (let milestone = 30; milestone <= wave; milestone += 10) {
      anchor = { normal: Math.floor(anchor.normal * 1.5), elite: anchor.elite * 2 };
    }
    const baseline = baseMaxHp(Math.floor(wave / 10) * 10);
    return { normal: anchor.normal + hp.normal - baseline.normal, elite: anchor.elite + hp.elite - baseline.elite };
  }
  function replenishEnemies() {
    let missing = 100 - enemies.filter(e => !e.dead).length;
    while (missing > 0 && run.toSpawn > 0) { spawnEnemy(); missing--; }
  }
  function spawnTimedEnemies(dt) {
    run.spawnElapsed = Math.min(10, run.spawnElapsed + dt);
    const target = Math.min(run.spawnTotal, Math.floor(run.spawnElapsed * run.spawnTotal / 10 + 1e-8));
    while (run.timedSpawned < target && run.toSpawn > 0) {
      spawnEnemy(); run.timedSpawned++;
    }
  }
  function rollUpgradeRarity() {
    const roll = Math.random();
    return roll < .70 ? { name: "ノーマル", key: "normal", multiplier: 1 }
      : roll < .95 ? { name: "アンコモン", key: "uncommon", multiplier: 2 }
        : { name: "レア", key: "rare", multiplier: 4 };
  }
  function setUpgradeOffer(button) {
    const rarity = rollUpgradeRarity(), m = rarity.multiplier;
    const titles = {
      power: `威力 +${m}`, rate: `連射速度 +${50 * m}%`, spread: `拡散 +${2 * m}発`,
      chain: `伝播対象 +${m}・範囲 +${20 * m}px`, chainDamage: `伝播ダメージ +${m}`,
      pierce: `貫通回数 +${m}`, split: `分裂確率 +${5 * m}ポイント`,
      splitCount: `分裂数 +${2 * m}発`, haste: `命中加速の上限 +${60 * m}ポイント`
    };
    button.dataset.rarity = rarity.key; button.dataset.multiplier = m;
    const description = button.querySelector("small");
    const badge = document.createElement("span"); badge.className = "game-rarity";
    badge.textContent = `${rarity.name} ×${m}`;
    button.replaceChildren(badge, document.createTextNode(titles[button.dataset.upgrade]), description);
  }
  function showUpgrades() {
    if (!run.choosing) {
      run.rerolls = 3; run.rewardsRemaining = run.wave % 5 === 0 ? 3 : 1; playSound("clear");
      // ウェーブクリアごとに破壊された文字を元の位置へ復元する
      letters.forEach(letter => { if (letter.broken) { letter.broken = false; letter.element.classList.remove("game-letter-gone"); } });
      bodies = []; run.broken = 0;
      upgradePanel.hidden = false; replayClass(upgradePanel, "is-open");
    }
    run.choosing = true; pointer = null; bullets = []; upgradePanel.hidden = false;
    $("p", upgradePanel).textContent = `WAVE ${run.wave} CLEAR`;
    $("h3", upgradePanel).textContent = `強化を選択（残り${run.rewardsRemaining}回）`;
    const buttons = [...upgradePanel.querySelectorAll("[data-upgrade]")];
    const pool = buttons.filter(b => (b.dataset.upgrade !== "chainDamage" || run.chain > 0) && (b.dataset.upgrade !== "split" || run.splitChance < 1) && (b.dataset.upgrade !== "splitCount" || run.splitChance > 0));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const offered = new Set(pool.slice(0, 3));
    let k = 0, revealDuration = 0;
    buttons.forEach(button => {
      button.hidden = !offered.has(button);
      button.classList.remove("is-picked", "is-leaving", "is-enter");
      if (!button.hidden) {
        setUpgradeOffer(button); button.style.setProperty("--k", k);
        const duration = button.dataset.rarity === "rare" ? 850 : button.dataset.rarity === "uncommon" ? 650 : 420;
        revealDuration = Math.max(revealDuration, duration + k * 70); k++;
        void button.offsetWidth; button.classList.add("is-enter");
      }
    });
    const reroll = $('[data-action="reroll"]', upgradePanel);
    reroll.textContent = `候補を引き直す（残り${run.rerolls}回）`; reroll.disabled = run.rerolls === 0;
    const focusOffer = () => { upgradePanel.classList.remove("is-revealing"); buttons.find(button => !button.hidden).focus({ preventScroll: true }); };
    if (!reduced) { upgradePanel.classList.add("is-revealing"); lockUpgradeUI(revealDuration, focusOffer); }
    else focusOffer();
  }
  function makeBullet(x, y, angle, power, canSplit = true, hit = new Set()) {
    return { x, y, vx: Math.cos(angle) * 760, vy: Math.sin(angle) * 760, life: 2, power, remaining: run.pierce, canSplit, hit };
  }
  function shoot() {
    if (!run?.aim || run.choosing || done) return;
    playSound("shot");
    const aim = Math.atan2(run.aim.y - ship.y, run.aim.x - ship.x);
    const spacing = run.spread > 1 ? Math.min(.11, (20 * Math.PI / 180) / (run.spread - 1)) : 0;
    for (let i = 0; i < run.spread; i++) {
      const angle = aim + (i - (run.spread - 1) / 2) * spacing;
      bullets.push(makeBullet(ship.x, ship.y, angle, run.power));
    }
    run.cooldown = run.interval / (1 + run.haste);
  }
  function damageEnemy(enemy, damage) {
    if (enemy.dead) return;
    enemy.hp -= damage; burst(enemy.x, enemy.y, "#ff9a3d", 8);
    if (enemy.hp <= 0) { enemy.dead = true; run.kills++; playSound("kill"); }
    else playSound("hit");
  }
  function enemyHit(enemy, bullet, x, y, children) {
    damageEnemy(enemy, bullet.power);
    const previousHaste = run.haste;
    run.haste = Math.min(run.hasteMax, run.haste + run.hasteMax / 20); run.idleHitTime = 0;
    run.cooldown *= (1 + previousHaste) / (1 + run.haste);
    chainHit(enemy);
    if (bullet.canSplit && Math.random() < run.splitChance) {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      const spacing = Math.min(.7, (120 * Math.PI / 180) / (run.splitCount - 1));
      for (let i = 0; i < run.splitCount; i++) {
        const offset = (i - (run.splitCount - 1) / 2) * spacing;
        children.push(makeBullet(x, y, angle + offset, bullet.power, false, new Set(bullet.hit)));
      }
    }
  }
  function chainHit(enemy) {
    let from = enemy;
    const visited = new Set([enemy]);
    for (let i = 0; i < run.chain; i++) {
      let next = null, distance = 120 + run.chain * 20;
      enemies.forEach(candidate => {
        if (candidate.dead || visited.has(candidate)) return;
        const d = Math.hypot(candidate.x - from.x, candidate.y - from.y);
        if (d <= distance) { distance = d; next = candidate; }
      });
      if (!next) break;
      for (let t = 0; t <= 1; t += .1) particles.push({ x: from.x + (next.x - from.x) * t, y: from.y + (next.y - from.y) * t, vx: 0, vy: 0, life: .2, color: "#b58cff" });
      visited.add(next); damageEnemy(next, run.chainDamage); from = next;
    }
  }
  let heat = null;
  function prepareHeat() {
    const glyphs = letters.filter(l => l.element.closest(".hero-title em") && ["熱", "量"].includes(l.text));
    if (glyphs.length !== 2) return;
    const left = Math.min(...glyphs.map(l => l.x - l.w / 2)), right = Math.max(...glyphs.map(l => l.x + l.w / 2));
    const upper = Math.min(...glyphs.map(l => l.y - l.h / 2)), lower = Math.max(...glyphs.map(l => l.y + l.h / 2));
    heat = { glyphs, x: (left + right) / 2, y: (upper + lower) / 2, w: right - left, h: lower - upper, time: 0 };
  }
  function hitHeat(bullet) {
    heat.time = .25; playSound("letter");
    heat.glyphs.forEach(l => { bullet.hit.add(l); l.element.classList.add("game-letter-gone"); });
    const targets = enemies.filter(e => !e.dead && Math.hypot(
      Math.max(0, Math.abs(e.x - heat.x) - heat.w / 2 - 10),
      Math.max(0, Math.abs(e.y - heat.y) - heat.h / 2 - 10)) <= e.r);
    targets.forEach(e => { if (!e.dead) { damageEnemy(e, bullet.power); chainHit(e); } });
  }
  function breakLetter(letter, bullet) {
    playSound("letter");
    letter.broken = true; letter.element.classList.add("game-letter-gone"); run.broken++;
    bodies.push(Object.assign(makeBody(letter.x, letter.y, letter.w, letter.h), { text: letter.text, font: letter.font, color: letter.color, vx: bullet.vx * .3 + rand(-80, 80), vy: bullet.vy * .3 - 80, omega: rand(-12, 12) }));
    burst(letter.x, letter.y, "#35e0ff", 6);
  }
  function segmentRect(x1, y1, x2, y2, r) {
    let lo = 0, hi = 1;
    for (const [p, d, min, max] of [[x1, x2 - x1, r.x, r.x + r.w], [y1, y2 - y1, r.y, r.y + r.h]]) {
      if (Math.abs(d) < 1e-8) { if (p < min || p > max) return null; continue; }
      let a = (min - p) / d, b = (max - p) / d; if (a > b) [a, b] = [b, a];
      lo = Math.max(lo, a); hi = Math.min(hi, b); if (lo > hi) return null;
    }
    return lo;
  }
  function updateDebris(dt) {
    if (heat?.time > 0) {
      heat.time = Math.max(0, heat.time - dt);
      if (!heat.time) heat.glyphs.forEach(l => l.element.classList.remove("game-letter-gone"));
    }
    bodies.forEach(body => {
      body.vy += 650 * dt; body.x += body.vx * dt; body.y += body.vy * dt; body.angle += body.omega * dt;
    });
    bodies = bodies.filter(body => body.y - (Math.abs(Math.sin(body.angle)) * body.w + Math.abs(Math.cos(body.angle)) * body.h) / 2 <= h);
  }
  function spawnEnemy() {
    const index = run.spawnTotal - run.toSpawn;
    const eliteOrder = run.eliteIndices.get(index);
    const currentEliteHp = run.eliteBaseHp + Math.max(0, run.eliteCount - 1) * 2;
    let hp, scale = 1;
    if (eliteOrder !== undefined) {
      // 精鋭: 出現順ごとのHP差も2倍。サイズは 1 + maxHp * 0.1 倍
      hp = run.eliteBaseHp + eliteOrder * 2;
      scale = hp <= 1 ? 1 : 1 + hp * .1;
    } else {
      const normalIdx = run.normalSpawned++;
      // 雑魚敵: 後半に出る高HP個体とのHP差も2倍 (サイズ1.0倍固定)
      hp = run.normalHp + (normalIdx >= run.normalCount - run.upgradedCount ? 2 : 0);
      // 5ウェーブごとに5%ずつ上昇する確率で、現在精鋭の最大HPの半分を持つ個体が出現 (雑魚敵の2倍サイズ固定)
      if (run.subEliteChance > 0 && Math.random() < run.subEliteChance) {
        hp = Math.max(hp, Math.max(1, Math.floor(currentEliteHp / 2)));
        scale = 2;
      }
    }
    const r = Math.min(16 * scale, Math.max(1, Math.min((w - 20) / 3, (floor - top - 40) / 2, w * .16)));
    const minX = r * 1.5 + 2, maxX = w - minX, spawnY = top + r + 20;
    // 出現位置: 既存の敵と重なりにくいX座標を探す。空きがなくてもラインより後ろ(上)には出さず、
    // 出現ラインへそのまま出して既存の敵を前(下・左右)へ押し出す（ある程度のめり込みは許容）
    const near = [];
    for (const e of enemies) {
      if (!e.dead && Math.abs(e.y - spawnY) < e.r + r) near.push(e);
    }
    let best = null;
    for (let attempt = 0; attempt < 16; attempt++) {
      const x = rand(minX, maxX);
      let nearest = Infinity;
      for (const e of near) nearest = Math.min(nearest, Math.hypot(e.x - x, e.y - spawnY) - (e.r + r) * ENEMY_MIN_DIST);
      if (!best || nearest > best.nearest) best = { x, nearest };
      if (nearest >= 0) break;
    }
    if (best.nearest < 0) {
      for (const e of near) {
        let dx = e.x - best.x, dy = Math.max(0, e.y - spawnY), d = Math.hypot(dx, dy);
        const min = (e.r + r) * ENEMY_MIN_DIST;
        if (d >= min) continue;
        if (d < 1e-4) { dx = (Math.random() - .5) * .2; dy = 1; d = Math.hypot(dx, dy); }
        const push = (min - d) * .65;
        e.x = clamp(e.x + (dx / d) * push, e.r * 1.5 + 2, w - e.r * 1.5 - 2);
        e.y = Math.max(top + e.r + 20, e.y + (dy / d) * push);
      }
    }
    enemies.push({ id: enemyId++, x: best.x, y: spawnY, r, hp, maxHp: hp, speed: 15, phase: rand(0, tau), label: Math.random() < .5 ? "NULL" : "LEAK" });
    run.toSpawn--;
  }
  // 敵同士の重なり解消: 空間ハッシュで近傍だけ判定し、ある程度のめり込みを許容しつつ出現ラインより下へ押し出す
  function separateEnemies() {
    if (enemies.length < 2) return;
    let maxR = 16;
    for (const e of enemies) if (!e.dead && e.r > maxR) maxR = e.r;
    const cell = maxR * 2, grid = new Map();
    const keyOf = (cx, cy) => cx * 73856093 ^ cy * 19349663;
    for (const e of enemies) {
      if (e.dead) continue;
      const k = keyOf(Math.floor(e.x / cell), Math.floor(e.y / cell));
      (grid.get(k) || grid.set(k, []).get(k)).push(e);
    }
    for (const a of enemies) {
      if (a.dead) continue;
      const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const list = grid.get(keyOf(cx + ox, cy + oy));
        if (!list) continue;
        for (const b of list) {
          if (b === a || b.dead || a.id > b.id) continue;
          let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          const min = (a.r + b.r) * ENEMY_MIN_DIST;
          if (d >= min) continue;
          if (d < 1e-4) { dx = (Math.random() - .5) * .2; dy = 1; d = Math.hypot(dx, dy); }
          const push = (min - d) * .35, nx = dx / d, ny = dy / d;
          a.x = clamp(a.x - nx * push, a.r * 1.5 + 2, w - a.r * 1.5 - 2);
          b.x = clamp(b.x + nx * push, b.r * 1.5 + 2, w - b.r * 1.5 - 2);
          const minYa = top + a.r + 20, minYb = top + b.r + 20;
          let ya = a.y - ny * push, yb = b.y + ny * push;
          if (ya < minYa) { yb += minYa - ya; ya = minYa; }
          if (yb < minYb) { ya += minYb - yb; yb = minYb; }
          a.y = Math.max(minYa, ya); b.y = Math.max(minYb, yb);
        }
      }
    }
  }
  function updateBugs(dt) {
    updateDebris(dt);
    if (run.choosing) return;
    run.idleHitTime += dt;
    while (run.idleHitTime >= 1) {
      run.idleHitTime -= 1;
      const previousHaste = run.haste;
      run.haste = Math.max(0, run.haste - .01);
      run.cooldown *= (1 + previousHaste) / (1 + run.haste);
    }
    run.cooldown = Math.max(0, run.cooldown - dt); if (run.aim && !run.cooldown) shoot();
    replenishEnemies();
    spawnTimedEnemies(dt);
    enemies.forEach(e => { e.y = Math.max(top + e.r + 20, e.y + e.speed * dt); e.x = clamp(e.x + Math.sin(elapsed * 2 + e.phase) * 18 * dt, e.r * 1.5 + 2, w - e.r * 1.5 - 2); });
    separateEnemies();
    enemies.forEach(e => { if (!e.dead && e.y + e.r > floor - 9) { e.dead = true; run.health = Math.max(0, run.health - 10); playSound("hurt"); burst(e.x, e.y, "#ff5b22"); } });
    const children = [];
    bullets.forEach(bullet => {
      const x = bullet.x + bullet.vx * dt, y = bullet.y + bullet.vy * dt; bullet.life -= dt;
      if (bullet.life <= 0) return;
      const hits = [];
      enemies.forEach(e => { if (e.dead || bullet.hit.has(e)) return; const t = segmentRect(bullet.x, bullet.y, x, y, { x: e.x - e.r, y: e.y - e.r, w: e.r * 2, h: e.r * 2 }); if (t !== null) hits.push({ t, target: e, letter: false }); });
      letters.forEach(l => { if (l.broken || bullet.hit.has(l)) return; const t = segmentRect(bullet.x, bullet.y, x, y, { x: l.x - l.w / 2, y: l.y - l.h / 2, w: l.w, h: l.h }); if (t !== null) hits.push({ t, target: l, letter: true }); });
      hits.sort((a, b) => a.t - b.t);
      for (const hit of hits) {
        if (hit.target.dead || hit.target.broken || bullet.hit.has(hit.target)) continue;
        bullet.hit.add(hit.target);
        if (hit.letter && heat?.glyphs.includes(hit.target)) { hitHeat(bullet); continue; }
        if (hit.letter) { breakLetter(hit.target, bullet); continue; }
        enemyHit(hit.target, bullet, bullet.x + (x - bullet.x) * hit.t, bullet.y + (y - bullet.y) * hit.t, children);
        if (bullet.remaining === 0) { bullet.life = 0; break; }
        bullet.remaining--;
      }
      bullet.x = x; bullet.y = y;
    });
    enemies = enemies.filter(e => !e.dead); bullets = bullets.filter(b => b.life > 0 && b.x > 0 && b.x < w && b.y > top && b.y < floor + 5);
    bullets.push(...children);
    if (run.health <= 0) { done = true; playSound("defeat"); }
    else {
      replenishEnemies();
      if (!enemies.length && !run.toSpawn) showUpgrades();
    }
  }
  function update(dt) {
    updateBugs(dt);
  }
  function updateStatus() {
    let text;
    if (mode === "bugs") text = `WAVE ${run.wave} · HP ${run.health} · ${run.kills} KILLS · ${run.toSpawn ? `出現残 ${run.toSpawn}体` : "全敵出現済み"} · 加速 ${(run.haste * 100).toFixed(2)} / ${(run.hasteMax * 100).toFixed(0)}%`;
    if (done) text = `GAME OVER · WAVE ${run.wave}`;
    if (status.textContent !== text) status.textContent = text;
    if (mode === "bugs") { top = $(".game-bar", session).getBoundingClientRect().bottom + 16; syncWaveProgress(); }
  }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function circle(x, y, radius, color, fill = false) { ctx.beginPath(); ctx.arc(x, y, radius, 0, tau); ctx[fill ? "fillStyle" : "strokeStyle"] = color; fill ? ctx.fill() : ctx.stroke(); }
  function label(text, x, y, color = "#eef2f5", size = 12) { ctx.fillStyle = color; ctx.font = `bold ${Math.max(10, size * clamp(Math.min(w / 600, h / 700), .85, 1.15))}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(text, x, y, Math.max(1, w - 24)); }
  function drawBody(b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    ctx.font = b.font; ctx.fillStyle = b.color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }
  function drawBugs() {
    if (heat?.time > 0) {
      const amount = heat.time / .25;
      ctx.save(); ctx.translate(heat.x, heat.y); ctx.scale(1 + 20 * amount / heat.w, 1 + 20 * amount / heat.h);
      heat.glyphs.forEach(l => { ctx.font = l.font; ctx.fillStyle = l.color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(l.text, l.x - heat.x, l.y - heat.y); });
      ctx.restore();
    }
    line(0, floor - 6, w, floor - 6, "#ff5b22", 2); label("DEFEND THE PAGE", w / 2, floor - 35, "#ff9a3d", 11);
    ctx.fillStyle = "#5dffa8"; ctx.fillRect(w / 2 - 60, floor - 28, 120 * run.health / 100, 3); circle(ship.x, ship.y, 11, "#35e0ff", true);
    if (run.aim) { line(ship.x, ship.y, run.aim.x, run.aim.y, "#35e0ff33"); circle(run.aim.x, run.aim.y, 6, "#35e0ff88"); }
    enemies.forEach(e => {
      const s = e.r / 16;
      for (let i = -1; i <= 1; i++) line(e.x - 24 * s, e.y + i * 9 * s, e.x + 24 * s, e.y - i * 9 * s, "#ff5b22");
      circle(e.x, e.y, e.r, "#1e101a", true); circle(e.x, e.y, e.r, "#ff5b22");
      label(e.label, e.x, e.y + 4 * s, "#ffb276", Math.round(10 * Math.min(1.6, Math.sqrt(s))));
      if (e.hp > 1) label(String(e.hp), e.x, e.y - e.r - 6, "#fff", Math.round(10 * Math.min(1.5, Math.sqrt(s))));
    });
    bullets.forEach(b => line(b.x, b.y, b.x - b.vx * .025, b.y - b.vy * .025, "#35e0ff", 3));
  }
  function draw() {
    ctx.clearRect(0, 0, w, h); ctx.save();
    bodies.forEach(drawBody);
    drawBugs();
    particles.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.restore(); ctx.globalAlpha = 1;
    if (done) { const y = (top + floor) / 2; ctx.fillStyle = "#06101df0"; ctx.fillRect(0, y - 48, w, 96); label("GAME OVER", w / 2, y, "#ff9a3d", Math.min(28, w / 16)); label("再スタートで再挑戦 / 終了でページに戻る", w / 2, y + 26, "#eef2f5", 11); }
  }
  function loop(now) {
    if (!mode || loading) return;
    const dt = Math.min((now - last) / 1000, .04); last = now;
    if (!document.hidden && pauseState === "running") {
      if (!done) { elapsed += dt; accumulator += dt; while (accumulator >= 1 / 120 && !done) { update(1 / 120); accumulator -= 1 / 120; } }
      else if (mode === "bugs") updateDebris(dt);
      particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.life -= dt; }); particles = particles.filter(p => p.life > 0);
      draw(); updateStatus();
    }
    frame = requestAnimationFrame(loop);
  }
  canvas.addEventListener("pointerdown", e => {
    if (!mode || loading || done || run?.choosing || pauseState !== "running") return;
    prepareAudio(); canvas.focus({ preventScroll: true });
    if (mode === "bugs") { run.aim = { x: e.clientX, y: e.clientY }; if (!run.cooldown) shoot(); }
    if (pointer) return;
    canvas.setPointerCapture(e.pointerId); pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  canvas.addEventListener("pointermove", e => {
    if (mode === "bugs" && run && !loading && !done && !run.choosing && pauseState === "running" && (e.pointerType !== "touch" || pointer?.id === e.pointerId)) {
      prepareAudio();
      run.aim = { x: e.clientX, y: e.clientY };
    }
    if (!pointer || e.pointerId !== pointer.id) return;
    pointer.x = e.clientX; pointer.y = e.clientY;
  });
  function release(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    pointer = null;
  }
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release); canvas.addEventListener("lostpointercapture", release);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (e.repeat) return;
      if (mode) { if (pauseState === "running") pauseGame(); else if (pauseState === "paused") resumeGame(); }
      else { if (!menuOpen) showMenuView("works"); showMenu(!menuOpen); toggle.focus({ preventScroll: true }); }
      return;
    }
    if (!mode) return;
    if (e.key === "Tab") {
      const focusable = (pauseState !== "running" ? [continueButton, toggle, ...menu.querySelectorAll("summary,a,button[data-game],button[data-action]")]
        : [...session.querySelectorAll("button,input,select,a,canvas"), toggle, ...(menuOpen ? menu.querySelectorAll("summary,a,button[data-game],button[data-action]") : [])]).filter(n => !n.disabled && n.getClientRects().length);
      const index = focusable.indexOf(document.activeElement), next = (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      e.preventDefault(); focusable[next].focus();
    }
    if (loading || done || document.activeElement !== canvas) return;
  });
  addEventListener("blur", () => { pointer = null; });
  document.addEventListener("visibilitychange", () => { pointer = null; last = performance.now(); if (document.hidden) silence(); });
  addEventListener("resize", () => { if (mode) start(mode); });
})();
