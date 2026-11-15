(() => {
  "use strict";
  const modes = {
    gravity: ["TYPE / PHYSICS", "文字を掴んで投げる · 文字／一画を切り替え", "OBB / SAT / angular impulse"],
    flight: ["PORTFOLIO FLIGHT", "WASD・矢印キー／押した位置へ操縦 · 文字と画像を避けてページ最下部へ", "DOM terrain / vector field / scroll camera"],
    bugs: ["BUG BUSTER", "カーソル／タップ位置へ自動射撃 · 文字も破壊可能 · ウェーブを突破して強化", "Destructible type / wave survival"],
    ring: ["SYSTEM CALIBRATION", "リングを回す → 目印に合わせて中央をタップ · ← → とEnterでも操作", "Angular inertia / alignment test"]
  };
  const $ = (s, root = document) => root.querySelector(s);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const tau = Math.PI * 2;
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const menu = document.createElement("aside");
  menu.className = "game-menu";
  menu.innerHTML = `<button type="button" aria-label="ゲームメニュー" aria-expanded="false" aria-controls="game-menu-panel">⋯</button>
    <div id="game-menu-panel" class="game-menu-panel" hidden><p>PORTFOLIO / PLAYGROUND</p><details open><summary>ゲームモード</summary><ul>
    <li><button data-game="gravity">01 — 文字と筆画の物理実験<small>TYPE / PHYSICS</small></button></li>
    <li><button data-game="flight">02 — サイト縦断フライト<small>PORTFOLIO FLIGHT</small></button></li>
    <li><button data-game="bugs">04 — Bug Buster<small>ROGUELIKE / TYPE BREAKER</small></button></li>
    <li><button data-game="ring">07 — リング・キャリブレーション<small>SYSTEM CALIBRATION</small></button></li>
    </ul></details><button type="button" data-action="sound" aria-pressed="true">SE: ON</button></div>`;
  const session = document.createElement("section");
  session.className = "game-session"; session.hidden = true;
  session.setAttribute("role", "dialog"); session.setAttribute("aria-modal", "true"); session.setAttribute("aria-labelledby", "game-title");
  session.innerHTML = `<canvas aria-label="ゲーム操作エリア" tabindex="0"></canvas>
    <div class="game-bar"><h2 id="game-title"></h2><output class="game-status" aria-live="polite"></output><button data-action="restart">↻ 再スタート</button><button data-action="exit">終了 ×</button></div>
    <div class="game-controls" hidden><label>分解単位 <select data-param="unit"><option value="letter">一文字ずつ</option><option value="stroke">一画ずつ（KanjiVG）</option></select></label><label>重力 <input aria-label="重力" data-param="gravity" type="range" min="0" max="1600" value="700"></label><label>反発 <input aria-label="反発" data-param="bounce" type="range" min="0" max="90" value="45"></label><label><input data-param="colliders" type="checkbox"> OBB表示</label><small class="game-stroke-credit" hidden>筆画: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer">KanjiVG</a> / <a href="game-strokes-LICENSE.txt" target="_blank" rel="noreferrer">CC BY-SA 3.0</a><br>未対応の記号は文字単位</small></div>
    <div class="game-upgrades" hidden><p>WAVE CLEAR</p><h3>次のウェーブへ向けて強化</h3><button data-upgrade="power">威力 +1<small>硬いバグを少ない弾で破壊</small></button><button data-upgrade="rate">連射速度 +25%<small>自動連射の間隔を短縮</small></button><button data-upgrade="spread">拡散 +2発<small>扇状に弾を発射</small></button><button data-upgrade="chain">伝播対象 +1・範囲 +20px<small>初期120pxから拡大。最寄りの敵へ順番に伝播</small></button><button data-upgrade="chainDamage">伝播ダメージ +1<small>伝播で与えるダメージを増加</small></button><button data-upgrade="pierce">貫通回数 +1<small>敵に当たっても先へ進む</small></button><button data-upgrade="split">分裂確率 +5ポイント<small>敵への命中時、左右に2発。再分裂なし</small></button><button data-upgrade="haste">命中加速の上限 +5ポイント<small>1ヒットで上限の1/20上昇。未命中1秒ごとに1ポイント減衰</small></button><button data-action="reroll">候補を引き直す（残り3回）</button></div>
    <div class="game-help"></div>`;
  // ポーズ画面: 三点リーダー以外をグレーアウトし、前面に PAUSE と Continue を表示
  const pauseLayer = document.createElement("div");
  pauseLayer.className = "game-pause"; pauseLayer.hidden = true;
  pauseLayer.setAttribute("role", "dialog"); pauseLayer.setAttribute("aria-modal", "true"); pauseLayer.setAttribute("aria-label", "ポーズ中");
  pauseLayer.innerHTML = `<aside class="game-pause-stats" aria-label="現在の強化ステータス" hidden><p>UPGRADE STATUS</p><h3>強化ステータス</h3><table><thead><tr><th>強化名</th><th>取得回数</th><th>数値</th></tr></thead><tbody></tbody></table></aside><h2 class="game-pause-title" aria-label="Pause">${[..."PAUSE"].map((c, i) => `<span aria-hidden="true" style="--i:${i}">${c}</span>`).join("")}</h2><button type="button" class="game-pause-continue">Continue</button>`;
  document.body.append(menu, session, pauseLayer);
  const continueButton = $(".game-pause-continue", pauseLayer), pauseStats = $(".game-pause-stats", pauseLayer), pauseStatsBody = $("tbody", pauseStats);
  const toggle = $("button", menu), panel = $(".game-menu-panel", menu);
  const canvas = $("canvas", session), ctx = canvas.getContext("2d");
  const controls = $(".game-controls", session), upgradePanel = $(".game-upgrades", session), status = $("output", session);
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
  const unit = $('[data-param="unit"]', controls), gravityInput = $('[data-param="gravity"]', controls), bounceInput = $('[data-param="bounce"]', controls);
  const keys = new Set();
  let mode = null, frame = 0, last = 0, elapsed = 0, accumulator = 0, w = 0, h = 0, top = 0, floor = 0;
  let bodies = [], letters = [], terrain = [], particles = [], bullets = [], enemies = [], wrappers = [], inertNodes = [];
  const ENEMY_MIN_DIST = .72; // 敵同士の最小距離率(半径合計の72%までは少しめり込みを許容し、それ以上で押し出す)
  let enemyId = 0;
  let pointer = null, drag = null, ship = null, ring = null, run = null, done = false, camera = 0, worldHeight = 0, savedScroll = 0;
  let strokeData = null, loading = false, generation = 0, fps = 0, fpsTime = 0, fpsFrames = 0;
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
    let touch = null;
    button.addEventListener("pointerdown", e => { if (e.pointerType === "touch" && e.isPrimary) touch = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    button.addEventListener("pointercancel", () => { touch = null; });
    button.addEventListener("pointerup", e => {
      if (!touch || e.pointerId !== touch.id) return;
      const r = button.getBoundingClientRect();
      const tapped = Math.hypot(e.clientX - touch.x, e.clientY - touch.y) < 12 && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      touch = null; if (tapped) action();
    });
    button.addEventListener("click", e => { if (e.pointerType !== "touch") action(); });
  }
  // 三点リーダーメニュー (開閉アニメーション付き)。開閉状態は menuOpen で管理する
  let menuOpen = false, menuCloseTimer = 0;
  function showMenu(open) {
    clearTimeout(menuCloseTimer);
    menuOpen = open; toggle.setAttribute("aria-expanded", String(open));
    if (open) { panel.hidden = false; panel.classList.remove("is-closing"); replayClass(panel, "is-opening"); }
    else if (!panel.hidden) {
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
      ["命中加速上限", picks.haste || 0, `${Math.round(run.hasteMax * 100)}%`]
    ];
    pauseStatsBody.innerHTML = rows.map(([name, count, val], i) => `<tr class="${count > 0 ? "is-upgraded" : ""}" style="--k:${i}"><td>${name}</td><td>${count}回</td><td>${val}</td></tr>`).join("");
  }
  function pauseGame() {
    if (!mode || loading || pauseState !== "running") return;
    pauseState = "opening";
    // 1. まずゲームを止める(このフレームの画面のまま固まる)
    keys.clear(); pointer = drag = null; silence();
    session.inert = true;
    renderPauseStats();
    replayClass(toggle, "is-kick"); showMenu(true);
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
    replayClass(toggle, "is-kick"); showMenu(false);
    pauseLayer.classList.add("is-out");
    pauseTimer = setTimeout(() => {
      if (pauseState !== "closing") return;
      resetPause(); last = performance.now(); canvas.focus({ preventScroll: true });
    }, PAUSE_OUT_MS);
  }
  function resetPause() {
    clearTimeout(pauseTimer); pauseState = "running";
    pauseLayer.hidden = true; pauseLayer.className = "game-pause"; session.inert = false;
  }
  activate(continueButton, resumeGame);
  activate(toggle, () => {
    if (mode) { if (pauseState === "running") pauseGame(); else resumeGame(); }
    else { replayClass(toggle, "is-kick"); showMenu(!menuOpen); }
  });
  document.addEventListener("pointerdown", e => { if (pauseState === "running" && menuOpen && !menu.contains(e.target)) showMenu(false); });
  menu.querySelectorAll("[data-game]").forEach(button => activate(button, () => start(button.dataset.game)));
  activate($('[data-action="exit"]', session), stop);
  activate($('[data-action="restart"]', session), () => start(mode));
  unit.addEventListener("change", () => start("gravity"));
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
    const choice = button.dataset.upgrade;
    run.picks[choice] = (run.picks[choice] || 0) + 1;
    if (choice === "power") run.power++;
    if (choice === "rate") run.interval /= 1.25;
    if (choice === "spread") run.spread += 2;
    if (choice === "chain") run.chain++;
    if (choice === "chainDamage") run.chainDamage++;
    if (choice === "pierce") run.pierce++;
    if (choice === "split") run.splitChance = Math.min(1, run.splitChance + .05);
    if (choice === "haste") run.hasteMax += .05;
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
    wrappers.forEach(({ wrapper, original }) => wrapper.replaceWith(original)); wrappers = [];
    bodies = []; letters = []; terrain = []; pointer = drag = null; keys.clear();
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
    w = document.documentElement.clientWidth; h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    top = $(".game-bar", session).getBoundingClientRect().bottom + 16;
    floor = h - $(".game-help", session).getBoundingClientRect().height - 26;
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
    controls.hidden = mode !== "gravity"; $(".game-stroke-credit", controls).hidden = unit.value !== "stroke";
    status.textContent = "PREPARING…";
    window.scrollTo({ top: mode === "flight" ? 0 : savedScroll, behavior: "instant" });
    await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(resolve));
    if (token !== generation) return;
    if (mode === "gravity" && unit.value === "stroke" && !strokeData) {
      if (typeof portfolioStrokeData === "undefined") {
        loading = false; status.textContent = "game-strokes.jsを読み込めません。ファイルの配置を確認してください"; return;
      }
      strokeData = portfolioStrokeData.glyphs;
    }
    if (token !== generation) return;
    dimensions(); elapsed = accumulator = fpsTime = fpsFrames = 0;
    particles = []; bullets = []; enemies = []; camera = 0; run = ring = ship = null;
    if (mode === "gravity" || mode === "bugs") captureLetters(false, true);
    if (mode === "gravity") {
      letters.forEach(letter => {
        letter.element.classList.add("game-letter-gone");
        if (unit.value === "stroke" && strokeData[letter.text]?.length) {
          strokeData[letter.text].forEach(stroke => {
            const sx = letter.w / 109, sy = letter.h / 109, [x, y, width, height] = stroke.box;
            const body = makeBody(letter.x - letter.w / 2 + (x + width / 2) * sx, letter.y - letter.h / 2 + (y + height / 2) * sy, Math.max(3, (width + 4) * sx), Math.max(3, (height + 4) * sy));
            Object.assign(body, { path: new Path2D(stroke.d), sx, sy, bx: x + width / 2, by: y + height / 2, color: letter.color }); bodies.push(body);
          });
        } else bodies.push(Object.assign(makeBody(letter.x, letter.y, letter.w, letter.h), { text: letter.text, font: letter.font, color: letter.color }));
      });
    }
    if (mode === "flight") {
      captureLetters(true, false); terrain = letters.map(l => ({ x: l.x - l.w / 2, y: l.y - l.h / 2, w: l.w, h: l.h, kind: "type" }));
      document.querySelectorAll("main img,main .skill-icon,main .work-media.visual").forEach(node => {
        const r = clippedRect(node.getBoundingClientRect(), node);
        if (r.width && r.height) terrain.push({ x: r.left, y: r.top + window.scrollY, w: r.width, h: r.height, kind: "image" });
      });
      worldHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      ship = { x: 8, y: top + 32, vx: 0, vy: 45, radius: 5, contacts: 0, cooldown: 0, goal: worldHeight - 70 };
    }
    if (mode === "bugs") { ship = { x: w / 2, y: floor - 14 }; run = { wave: 1, kills: 0, health: 100, power: 1, interval: .24, spread: 1, cooldown: 0, choosing: false, broken: 0, chain: 0, chainDamage: 1, pierce: 0, splitChance: 0, hasteMax: 0, haste: 0, idleHitTime: 0, picks: {} }; beginWave(); }
    if (mode === "ring") {
      const labels = [...document.querySelectorAll(".skill-card h3")].slice(0, 3).map(n => n.textContent);
      ring = { x: w / 2, y: (top + floor) / 2, radius: Math.max(42, Math.min(w * .34, (floor - top) * .36, 175)), angle: -Math.PI / 2, velocity: 0, index: 0, targets: [-.4, 2.1, -2.5], labels, feedback: 0 };
    }
    loading = false; playSound("start"); updateStatus(); canvas.focus({ preventScroll: true }); last = performance.now(); frame = requestAnimationFrame(loop);
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
  function captureLetters(world, wrap) {
    const walker = document.createTreeWalker($("main"), NodeFilter.SHOW_TEXT), nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, parent = node.parentElement;
      if (!node.textContent.trim() || parent.closest("script,style,svg,.marquee,.hero-hud,.section-bg-num,.scroll-cue")) continue;
      const r = parent.getBoundingClientRect(), style = getComputedStyle(parent);
      if (!r.width || !r.height || style.visibility === "hidden" || (!world && (r.bottom < top || r.top > floor))) continue;
      nodes.push(node);
    }
    const measured = [];
    nodes.forEach(original => {
      const segments = [...segmenter.segment(original.textContent)];
      if (wrap) {
        const wrapper = document.createElement("span"); wrapper.className = "game-text-wrap";
        segments.forEach(({ segment }) => {
          if (/^\s+$/.test(segment)) { wrapper.append(document.createTextNode(segment)); return; }
          const element = document.createElement("span"); element.className = "game-letter"; element.textContent = segment; wrapper.append(element);
          measured.push({ text: segment, element, rect: () => element.getBoundingClientRect() });
        });
        original.replaceWith(wrapper); wrappers.push({ original, wrapper });
      } else segments.forEach(({ segment, index }) => {
        if (/^\s+$/.test(segment)) return;
        const range = document.createRange(); range.setStart(original, index); range.setEnd(original, index + segment.length);
        measured.push({ text: segment, element: original.parentElement, rect: () => range.getBoundingClientRect() });
      });
    });
    measured.forEach(item => {
      const r = clippedRect(item.rect(), item.element), style = getComputedStyle(item.element), size = parseFloat(style.fontSize);
      if (!r.width || !r.height || r.right < 0 || r.left > w || (!world && (r.top < top || r.bottom > floor))) return;
      const color = style.color === "rgba(0, 0, 0, 0)" || style.color === "transparent" ? "#ff9a3d" : style.color;
      letters.push({ text: item.text, element: item.element, x: r.left + r.width / 2, y: r.top + r.height / 2 + (world ? window.scrollY : 0), w: r.width, h: Math.min(r.height, size * 1.1), font: `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, color, broken: false });
    });
  }
  function makeBody(x, y, width, height) {
    return { x, y, w: Math.max(2, width), h: Math.max(2, height), vx: rand(-35, 35), vy: 0, angle: 0, omega: rand(-1, 1), invMass: 1, invInertia: 12 / (width * width + height * height), bounds: null };
  }
  function geometry(b) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle), u = { x: c, y: s }, v = { x: -s, y: c };
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({ x: b.x + u.x * b.w * x / 2 + v.x * b.h * y / 2, y: b.y + u.y * b.w * x / 2 + v.y * b.h * y / 2 }));
    const ex = Math.abs(c) * b.w / 2 + Math.abs(s) * b.h / 2, ey = Math.abs(s) * b.w / 2 + Math.abs(c) * b.h / 2;
    return { u, v, corners, left: b.x - ex, right: b.x + ex, top: b.y - ey, bottom: b.y + ey };
  }
  function contact(a, b) {
    const ga = geometry(a), gb = geometry(b), delta = { x: b.x - a.x, y: b.y - a.y };
    let depth = Infinity, normal;
    for (const axis of [ga.u, ga.v, gb.u, gb.v]) {
      const ra = a.w / 2 * Math.abs(dot(ga.u, axis)) + a.h / 2 * Math.abs(dot(ga.v, axis));
      const rb = b.w / 2 * Math.abs(dot(gb.u, axis)) + b.h / 2 * Math.abs(dot(gb.v, axis));
      const overlap = ra + rb - Math.abs(dot(delta, axis)); if (overlap <= 0) return null;
      if (overlap < depth) { depth = overlap; const sign = dot(delta, axis) < 0 ? -1 : 1; normal = { x: axis.x * sign, y: axis.y * sign }; }
    }
    const support = (corners, n) => {
      const max = Math.max(...corners.map(p => dot(p, n))), edge = corners.filter(p => max - dot(p, n) < .05);
      return { x: edge.reduce((s, p) => s + p.x, 0) / edge.length, y: edge.reduce((s, p) => s + p.y, 0) / edge.length };
    };
    const pa = support(ga.corners, normal), pb = support(gb.corners, { x: -normal.x, y: -normal.y });
    return { normal, depth, point: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 } };
  }
  function resolve(a, b, hit, restitution) {
    const n = hit.normal, point = hit.point, imA = drag?.body === a ? 0 : a.invMass, imB = drag?.body === b ? 0 : b.invMass;
    const iiA = imA ? a.invInertia : 0, iiB = imB ? b.invInertia : 0, mass = imA + imB; if (!mass) return;
    const correction = Math.max(0, hit.depth - .05) * .8 / mass;
    a.x -= n.x * correction * imA; a.y -= n.y * correction * imA; b.x += n.x * correction * imB; b.y += n.y * correction * imB;
    const ra = { x: point.x - a.x, y: point.y - a.y }, rb = { x: point.x - b.x, y: point.y - b.y };
    const relative = { x: b.vx - b.omega * rb.y - a.vx + a.omega * ra.y, y: b.vy + b.omega * rb.x - a.vy - a.omega * ra.x };
    const speed = dot(relative, n); if (speed >= 0) return;
    if (mode === "gravity" && speed < -120) playSound("hit");
    const angularA = cross(ra, n), angularB = cross(rb, n);
    const impulse = -(1 + (speed < -25 ? restitution : 0)) * speed / (mass + angularA ** 2 * iiA + angularB ** 2 * iiB);
    a.vx -= impulse * n.x * imA; a.vy -= impulse * n.y * imA; a.omega -= impulse * angularA * iiA;
    b.vx += impulse * n.x * imB; b.vy += impulse * n.y * imB; b.omega += impulse * angularB * iiB;
    const tangent = { x: -n.y, y: n.x }, ta = cross(ra, tangent), tb = cross(rb, tangent);
    const friction = clamp(-dot(relative, tangent) / (mass + ta * ta * iiA + tb * tb * iiB), -impulse * .35, impulse * .35);
    a.vx -= friction * tangent.x * imA; a.vy -= friction * tangent.y * imA; a.omega -= friction * ta * iiA;
    b.vx += friction * tangent.x * imB; b.vy += friction * tangent.y * imB; b.omega += friction * tb * iiB;
  }
  const wall = { x: 0, y: 0, vx: 0, vy: 0, omega: 0, invMass: 0, invInertia: 0 };
  function boundaries(b, restitution) {
    for (const side of ["left", "right", "top", "bottom"]) {
      const g = geometry(b), vertical = side === "top" || side === "bottom";
      const depth = side === "left" ? -g.left : side === "right" ? g.right - w : side === "top" ? top - g.top : g.bottom - floor;
      if (depth <= 0) continue;
      const n = { x: vertical ? 0 : side === "left" ? -1 : 1, y: vertical ? side === "top" ? -1 : 1 : 0 };
      const max = Math.max(...g.corners.map(p => dot(p, n))), edge = g.corners.filter(p => max - dot(p, n) < .1);
      const point = { x: edge.reduce((sum, p) => sum + p.x, 0) / edge.length, y: edge.reduce((sum, p) => sum + p.y, 0) / edge.length };
      resolve(b, wall, { normal: n, point, depth }, restitution);
    }
  }
  function physics(dt) {
    const gravity = mode === "gravity" ? Number(gravityInput.value) : 650, bounce = mode === "gravity" ? Number(bounceInput.value) / 100 : .4;
    bodies.forEach(b => {
      if (drag?.body === b) return;
      b.vy += gravity * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.omega * dt; b.omega *= Math.exp(-.25 * dt); boundaries(b, bounce);
    });
    for (let pass = 0; pass < 2; pass++) {
      const grid = new Map(), pairs = new Set();
      bodies.forEach((b, i) => {
        const g = geometry(b); b.bounds = g;
        for (let x = Math.floor(g.left / 48); x <= Math.floor(g.right / 48); x++) for (let y = Math.floor(g.top / 48); y <= Math.floor(g.bottom / 48); y++) {
          const key = `${x},${y}`, bucket = grid.get(key) || [];
          bucket.forEach(j => {
            const pair = j * bodies.length + i; if (pairs.has(pair)) return; pairs.add(pair);
            const other = bodies[j], og = other.bounds;
            if (g.left >= og.right || g.right <= og.left || g.top >= og.bottom || g.bottom <= og.top) return;
            const hit = contact(other, b); if (hit) resolve(other, b, hit, bounce);
          });
          bucket.push(i); grid.set(key, bucket);
        }
      });
      bodies.forEach(b => boundaries(b, bounce));
    }
  }
  function hitBody(x, y, b) {
    const c = Math.cos(b.angle), s = Math.sin(b.angle), dx = x - b.x, dy = y - b.y;
    return Math.abs(dx * c + dy * s) <= b.w / 2 && Math.abs(-dx * s + dy * c) <= b.h / 2;
  }
  function burst(x, y, color, count = 20) {
    for (let i = 0; i < (reduced ? 4 : count); i++) { const a = rand(0, tau), speed = rand(40, 200); particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: rand(.25, .7), color }); }
  }
  function wind(x, y) { return { x: Math.sin(y * .006 + elapsed * .5) * 30, y: 20 + Math.cos(x * .008) * 12 }; }
  function updateFlight(dt) {
    const flow = wind(ship.x, ship.y);
    let ax = (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0) - (keys.has("KeyA") || keys.has("ArrowLeft") ? 1 : 0);
    let ay = (keys.has("KeyS") || keys.has("ArrowDown") ? 1 : 0) - (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0);
    if (pointer) { ax = clamp((pointer.x - ship.x) / 40, -1, 1); ay = clamp((pointer.y + camera - ship.y) / 45, -1, 1); }
    ship.vx = (ship.vx + (ax * 320 + flow.x) * dt) * Math.exp(-2.4 * dt); ship.vy = (ship.vy + (ay * 280 + 150 + flow.y) * dt) * Math.exp(-2 * dt);
    const oldX = ship.x, oldY = ship.y;
    ship.x = clamp(ship.x + ship.vx * dt, ship.radius + 1, w - ship.radius - 1);
    ship.y = clamp(ship.y + ship.vy * dt, top + 20, worldHeight - 20); ship.cooldown = Math.max(0, ship.cooldown - dt);
    for (const obstacle of terrain) {
      if (Math.abs(obstacle.y - ship.y) > obstacle.h + 25) continue;
      const px = clamp(ship.x, obstacle.x, obstacle.x + obstacle.w), py = clamp(ship.y, obstacle.y, obstacle.y + obstacle.h);
      if (Math.hypot(ship.x - px, ship.y - py) >= ship.radius) continue;
      ship.x = oldX; ship.y = oldY; ship.vx *= -.45; ship.vy *= -.35;
      if (!ship.cooldown) { ship.contacts++; ship.cooldown = .5; playSound("hurt"); burst(ship.x, ship.y, "#ff9a3d", 8); } break;
    }
    camera = clamp(ship.y - h * .42, 0, worldHeight - h);
    if (ship.y >= ship.goal) { done = true; playSound("clear"); burst(ship.x, ship.y, "#5dffa8", 50); }
  }
  function beginWave() {
    run.choosing = false; run.uiLocked = false; upgradePanel.inert = false;
    upgradePanel.classList.remove("is-locked", "is-bump", "is-open");
    run.spawnTotal = maxSpawnCount(run.wave);
    const fiveWaves = Math.floor(run.wave / 5);
    const tenWaves = Math.floor(run.wave / 10);
    const hpStage = Math.floor((run.wave - 1) / 10);
    run.eliteCount = Math.floor((run.wave - 1) / 5); // 精鋭出現数
    run.normalCount = run.spawnTotal - run.eliteCount;
    // 5ウェーブごとに敵全体の最大HP+1、10ウェーブごとに雑魚+2 / 精鋭+10、さらに20ウェーブ以降は10の位の数値(tenWaves * 10)を追加加算
    const eliteDecadeBonus = tenWaves >= 2 ? tenWaves * 10 : 0;
    run.normalHp = Math.max(1, hpStage) + fiveWaves + tenWaves * 2;
    run.upgradedCount = hpStage === 0 ? 0 : Math.round(run.normalCount * ((run.wave - 1) % 10 + 1) / 10);
    run.eliteBaseHp = 1 + Math.floor((run.wave - 1) / 2) + fiveWaves + tenWaves * 10 + eliteDecadeBonus;
    // 5ウェーブごとに準精鋭(現在精鋭の最大HPの半分)の出現確率が5%ずつ上昇 (100ウェーブで100%)
    run.subEliteChance = Math.min(1, fiveWaves * .05);
    // 精鋭の出現タイミング: 最大敵数 / 精鋭出現数 ごとに1体出現
    run.eliteIndices = new Map();
    if (run.eliteCount > 0) {
      const step = run.spawnTotal / run.eliteCount;
      for (let k = 0; k < run.eliteCount; k++) {
        let idx = Math.min(run.spawnTotal - 1, Math.round((k + 1) * step) - 1);
        while (run.eliteIndices.has(idx) && idx > 0) idx--;
        run.eliteIndices.set(idx, k); // k番目に出る精鋭ほど最大HP +k (1体目+0, 2体目+1, ...)
      }
    }
    run.normalSpawned = 0;
    run.toSpawn = run.spawnTotal; run.spawnInterval = 30 / (run.spawnTotal - 1);
    run.spawnIn = 0; run.spawnElapsed = 0; run.cooldown = 0; upgradePanel.hidden = true; bullets = [];
    syncWaveProgress();
  }
  // ウェーブ最大出現数 (案B)
  //   fiveWaves = wave / 5
  //   通常: 8 * (int)(fiveWaves * 0.5 + 1) + 12 * wave * (fiveWaves * 4 + 1)
  //   5の倍数ウェーブ: 通常 + 前ウェーブ最大出現数 * 3
  function maxSpawnCount(targetWave) {
    let count = 0;
    for (let wave = 1; wave <= targetWave; wave++) {
      const fiveWaves = Math.floor(wave / 5);
      const base = 8 * Math.floor(fiveWaves * 0.5 + 1) + 12 * wave * (fiveWaves * 4 + 1);
      count = base + (wave % 5 === 0 ? count * 3 : 0);
    }
    return count;
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
    const pool = buttons.filter(b => (b.dataset.upgrade !== "chainDamage" || run.chain > 0) && (b.dataset.upgrade !== "split" || run.splitChance < 1));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const offered = new Set(pool.slice(0, 3));
    let k = 0;
    buttons.forEach(button => {
      button.hidden = !offered.has(button);
      button.classList.remove("is-picked", "is-leaving", "is-enter");
      if (!button.hidden) { button.style.setProperty("--k", k++); void button.offsetWidth; button.classList.add("is-enter"); }
    });
    const reroll = $('[data-action="reroll"]', upgradePanel);
    reroll.textContent = `候補を引き直す（残り${run.rerolls}回）`; reroll.disabled = run.rerolls === 0;
    buttons.find(button => !button.hidden).focus();
  }
  function makeBullet(x, y, angle, power, canSplit = true, hit = new Set()) {
    return { x, y, vx: Math.cos(angle) * 760, vy: Math.sin(angle) * 760, life: 2, power, remaining: run.pierce, canSplit, hit };
  }
  function shoot() {
    if (!run?.aim || run.choosing || done) return;
    playSound("shot");
    const aim = Math.atan2(run.aim.y - ship.y, run.aim.x - ship.x);
    for (let i = 0; i < run.spread; i++) {
      const angle = aim + (i - (run.spread - 1) / 2) * .11;
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
    if (bullet.canSplit && Math.random() < run.splitChance) {
      const angle = Math.atan2(bullet.vy, bullet.vx);
      for (const offset of [-.35, .35]) children.push(makeBullet(x, y, angle + offset, bullet.power, false, new Set(bullet.hit)));
    }
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
    bodies.forEach(body => {
      body.vy += 650 * dt; body.x += body.vx * dt; body.y += body.vy * dt; body.angle += body.omega * dt;
    });
    bodies = bodies.filter(body => geometry(body).top <= h);
  }
  function spawnEnemy() {
    const index = run.spawnTotal - run.toSpawn;
    const eliteOrder = run.eliteIndices.get(index);
    const currentEliteHp = run.eliteBaseHp + Math.max(0, run.eliteCount - 1);
    let hp, scale = 1;
    if (eliteOrder !== undefined) {
      // 精鋭: 最大敵数/精鋭出現数ごとに出現し、出る順番が遅いほど最大HP+1。サイズは 1 + maxHp * 0.1 倍
      hp = run.eliteBaseHp + eliteOrder;
      scale = hp <= 1 ? 1 : 1 + hp * .1;
    } else {
      const normalIdx = run.normalSpawned++;
      // 雑魚敵: 前半は低く後半になるにつれ+1される段階仕様と、全体+1/5W・雑魚+2/10Wが多重で発動 (サイズ1.0倍固定)
      hp = run.normalHp + (normalIdx >= run.normalCount - run.upgradedCount ? 1 : 0);
      // 5ウェーブごとに5%ずつ上昇する確率で、現在精鋭の最大HPの半分を持つ個体が出現 (雑魚敵の2倍サイズ固定)
      if (run.subEliteChance > 0 && Math.random() < run.subEliteChance) {
        hp = Math.max(hp, Math.max(1, Math.floor(currentEliteHp / 2)));
        scale = 2;
      }
    }
    const r = Math.min(16 * scale, Math.max(32, (w - 40) * .22));
    const minX = r + 9, maxX = Math.max(minX, w - r - 9), spawnY = top + r + 4;
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
        e.x = clamp(e.x + (dx / d) * push, e.r + 2, w - e.r - 2);
        e.y = Math.max(top + e.r + 4, e.y + (dy / d) * push);
      }
    }
    enemies.push({ id: enemyId++, x: best.x, y: spawnY, r, hp, maxHp: hp, speed: 15, phase: rand(0, tau), label: Math.random() < .5 ? "NULL" : "LEAK" });
    run.toSpawn--; run.spawnIn += run.spawnInterval;
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
          a.x = clamp(a.x - nx * push, a.r + 2, w - a.r - 2);
          b.x = clamp(b.x + nx * push, b.r + 2, w - b.r - 2);
          const minYa = top + a.r + 4, minYb = top + b.r + 4;
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
    run.spawnElapsed = Math.min(30, run.spawnElapsed + dt);
    run.spawnIn -= dt;
    while (run.toSpawn > 0 && run.spawnIn <= 1e-9) {
      spawnEnemy();
    }
    enemies.forEach(e => { e.y += e.speed * dt; e.x = clamp(e.x + Math.sin(elapsed * 2 + e.phase) * 18 * dt, e.r + 2, w - e.r - 2); });
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
        if (hit.target.dead || hit.target.broken) continue;
        bullet.hit.add(hit.target);
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
    else if (!enemies.length) {
      if (run.toSpawn > 0) spawnEnemy();
      else showUpgrades();
    }
  }
  function confirmRing() {
    if (!ring || done) return;
    if (Math.abs(angleDelta(ring.angle, ring.targets[ring.index])) > .16 || Math.abs(ring.velocity) > .6) { ring.feedback = -.5; playSound("hurt"); return; }
    burst(ring.x, ring.y, "#35e0ff", 26); ring.index++; ring.velocity = 0; ring.feedback = .6; if (ring.index === 3) done = true;
    playSound(done ? "clear" : "upgrade");
  }
  function updateRing(dt) {
    if (!drag) { const direction = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0); ring.velocity += direction * 5 * dt; ring.angle += ring.velocity * dt; }
    ring.velocity *= Math.exp(-(drag ? 10 : 5) * dt);
    ring.feedback *= Math.exp(-4 * dt);
  }
  function update(dt) {
    if (mode === "gravity") physics(dt); else if (mode === "flight") updateFlight(dt); else if (mode === "bugs") updateBugs(dt); else if (mode === "ring") updateRing(dt);
  }
  function updateStatus() {
    let text;
    if (mode === "gravity") text = `${bodies.length} ${unit.value === "stroke" ? "PARTS" : "GLYPHS"} · ${fps} FPS`;
    if (mode === "flight") text = `${Math.floor(clamp(ship.y / ship.goal, 0, 1) * 100)}% · 接触 ${ship.contacts}`;
    if (mode === "bugs") text = `WAVE ${run.wave} · HP ${run.health} · ${run.kills} KILLS · ${run.toSpawn ? `出現残 ${Math.ceil(30 - run.spawnElapsed)}s / ${run.toSpawn}体` : "全敵出現済み"} · 加速 ${(run.haste * 100).toFixed(2)} / ${(run.hasteMax * 100).toFixed(0)}%`;
    if (mode === "ring") text = `${ring.index} / 3 · ${ring.labels[Math.min(ring.index, 2)]}`;
    if (done) text = mode === "bugs" ? `GAME OVER · WAVE ${run.wave}` : mode === "ring" ? "SYSTEM CALIBRATED" : "FLIGHT COMPLETE";
    if (status.textContent !== text) status.textContent = text;
    if (mode === "bugs") syncWaveProgress();
  }
  function line(x1, y1, x2, y2, color, width = 1) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function circle(x, y, radius, color, fill = false) { ctx.beginPath(); ctx.arc(x, y, radius, 0, tau); ctx[fill ? "fillStyle" : "strokeStyle"] = color; fill ? ctx.fill() : ctx.stroke(); }
  function label(text, x, y, color = "#eef2f5", size = 12) { ctx.fillStyle = color; ctx.font = `bold ${size}px monospace`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText(text, x, y); }
  function drawBody(b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.angle);
    if (b.path) { ctx.scale(b.sx, b.sy); ctx.translate(-b.bx, -b.by); ctx.strokeStyle = b.color; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(b.path); }
    else { ctx.font = b.font; ctx.fillStyle = b.color; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.text, 0, 0); }
    ctx.restore();
    if (mode === "gravity" && $('[data-param="colliders"]', controls).checked) {
      const g = geometry(b); ctx.beginPath(); g.corners.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); ctx.strokeStyle = "#5dffa899"; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  function drawFlight() {
    for (let x = 24; x < w; x += 72) for (let y = Math.floor(camera / 64) * 64; y < camera + h; y += 64) { const f = wind(x, y); line(x, y, x + f.x * .4, y + f.y * .4, "#35e0ff35"); }
    terrain.forEach(o => { if (o.y + o.h < camera || o.y > camera + h) return; ctx.strokeStyle = o.kind === "image" ? "#ff9a3d99" : "#35e0ff45"; ctx.lineWidth = 1; ctx.strokeRect(o.x, o.y, o.w, o.h); });
    line(0, ship.goal, w, ship.goal, "#5dffa8", 3); label("PORTFOLIO / FINISH", w / 2, ship.goal - 14, "#5dffa8", 16);
    ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(Math.atan2(ship.vy, ship.vx) - Math.PI / 2);
    ctx.shadowBlur = reduced ? 0 : 14; ctx.shadowColor = "#35e0ff"; ctx.fillStyle = ship.cooldown ? "#ff9a3d" : "#fff";
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(-5, -6); ctx.lineTo(0, -3); ctx.lineTo(5, -6); ctx.closePath(); ctx.fill(); line(0, -6, 0, -15, "#35e0ff", 2); ctx.restore();
    circle(ship.x, ship.y, 11, "#35e0ff88");
  }
  function drawBugs() {
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
  function drawRing() {
    const r = ring.radius, target = ring.targets[Math.min(ring.index, 2)], aligned = Math.abs(angleDelta(ring.angle, target)) <= .16;
    circle(ring.x, ring.y, r + 18, "#06101dec", true);
    for (let band = 0; band < 3; band++) circle(ring.x, ring.y, r + band * 7, band < ring.index ? "#5dffa8" : "#35e0ff44");
    for (let i = 0; i < 60; i++) { const a = i / 60 * tau + ring.angle, inner = r - (i % 5 === 0 ? 16 : 7); line(ring.x + Math.cos(a) * inner, ring.y + Math.sin(a) * inner, ring.x + Math.cos(a) * r, ring.y + Math.sin(a) * r, i % 5 ? "#8d9aa6" : "#35e0ff", 2); }
    circle(ring.x + Math.cos(target) * r, ring.y + Math.sin(target) * r, 10, aligned ? "#5dffa8" : "#ff9a3d", true);
    line(ring.x + Math.cos(ring.angle) * (r - 25), ring.y + Math.sin(ring.angle) * (r - 25), ring.x + Math.cos(ring.angle) * (r + 22), ring.y + Math.sin(ring.angle) * (r + 22), "#fff", 4);
    circle(ring.x, ring.y, r * .5, ring.feedback < -.1 ? "#ff5b2233" : "#35e0ff22", true); circle(ring.x, ring.y, r * .5, aligned ? "#5dffa8" : "#35e0ff");
    label(done ? "CALIBRATED" : aligned ? "LOCK / TAP" : "ROTATE", ring.x, ring.y + 5, aligned ? "#5dffa8" : "#fff", Math.min(16, r * .13));
    label(ring.labels[Math.min(ring.index, 2)], ring.x, ring.y - r - 32, "#ffb276", 12); label(`${ring.index} / 3`, ring.x, ring.y + r + 38, "#35e0ff", 13);
  }
  function draw() {
    ctx.clearRect(0, 0, w, h); ctx.save(); if (mode === "flight") ctx.translate(0, -camera);
    bodies.forEach(drawBody);
    if (mode === "flight") drawFlight(); if (mode === "bugs") drawBugs(); if (mode === "ring") drawRing();
    particles.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); }); ctx.restore(); ctx.globalAlpha = 1;
    if (done && mode !== "ring") { const y = (top + floor) / 2; ctx.fillStyle = "#06101df0"; ctx.fillRect(0, y - 48, w, 96); label(mode === "bugs" ? "GAME OVER" : "FLIGHT COMPLETE", w / 2, y, mode === "bugs" ? "#ff9a3d" : "#5dffa8", Math.min(28, w / 16)); label("再スタートで再挑戦 / 終了でページに戻る", w / 2, y + 26, "#eef2f5", 11); }
  }
  function loop(now) {
    if (!mode || loading) return;
    const dt = Math.min((now - last) / 1000, .04); last = now;
    if (!document.hidden && pauseState === "running") {
      if (!done) { elapsed += dt; accumulator += dt; while (accumulator >= 1 / 120 && !done) { update(1 / 120); accumulator -= 1 / 120; } }
      else if (mode === "bugs") updateDebris(dt);
      particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; p.life -= dt; }); particles = particles.filter(p => p.life > 0);
      if (mode === "flight") window.scrollTo({ top: camera, behavior: "instant" });
      fpsTime += dt; fpsFrames++; if (fpsTime >= .5) { fps = Math.round(fpsFrames / fpsTime); fpsTime = fpsFrames = 0; }
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
    if (mode === "gravity") {
      const body = [...bodies].reverse().find(b => hitBody(e.clientX, e.clientY, b));
      if (body) { drag = { body, ox: e.clientX - body.x, oy: e.clientY - body.y, time: performance.now() }; body.omega = 0; }
    }
    if (mode === "ring") {
      const distance = Math.hypot(e.clientX - ring.x, e.clientY - ring.y);
      if (distance < ring.radius * .5) drag = { confirm: true };
      else if (distance < ring.radius + 40) drag = { angle: Math.atan2(e.clientY - ring.y, e.clientX - ring.x), time: performance.now() };
    }
  });
  canvas.addEventListener("pointermove", e => {
    if (mode === "bugs" && run && !loading && !done && !run.choosing && pauseState === "running" && (e.pointerType !== "touch" || pointer?.id === e.pointerId)) {
      prepareAudio();
      run.aim = { x: e.clientX, y: e.clientY };
    }
    if (!pointer || e.pointerId !== pointer.id) return;
    pointer.x = e.clientX; pointer.y = e.clientY;
    if (drag?.body) {
      const now = performance.now(), dt = Math.max(.008, (now - drag.time) / 1000), b = drag.body;
      const x = clamp(e.clientX - drag.ox, b.w / 2, w - b.w / 2), y = clamp(e.clientY - drag.oy, top + b.h / 2, floor - b.h / 2);
      b.vx = clamp((x - b.x) / dt, -900, 900); b.vy = clamp((y - b.y) / dt, -900, 900); b.x = x; b.y = y; drag.time = now;
    }
    if (mode === "ring" && drag && !drag.confirm) {
      const now = performance.now(), angle = Math.atan2(e.clientY - ring.y, e.clientX - ring.x), delta = angleDelta(angle, drag.angle);
      ring.angle += delta; ring.velocity = clamp(delta / Math.max(.016, (now - drag.time) / 1000), -6, 6); drag.angle = angle; drag.time = now;
    }
  });
  function release(e) {
    if (!pointer || pointer.id !== e.pointerId) return;
    if (mode === "ring" && drag?.confirm && e.type === "pointerup" && Math.hypot(e.clientX - ring.x, e.clientY - ring.y) < ring.radius * .5) confirmRing();
    pointer = drag = null;
  }
  canvas.addEventListener("pointerup", release); canvas.addEventListener("pointercancel", release); canvas.addEventListener("lostpointercapture", release);
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (e.repeat) return;
      if (mode) { if (pauseState === "running") pauseGame(); else if (pauseState === "paused") resumeGame(); }
      else { replayClass(toggle, "is-kick"); showMenu(!menuOpen); toggle.focus({ preventScroll: true }); }
      return;
    }
    if (!mode) return;
    if (e.key === "Tab") {
      const focusable = (pauseState !== "running" ? [continueButton, toggle, ...menu.querySelectorAll("summary,button[data-game],button[data-action]")]
        : [...session.querySelectorAll("button,input,select,a,canvas"), toggle, ...(menuOpen ? menu.querySelectorAll("summary,button[data-game],button[data-action]") : [])]).filter(n => !n.disabled && n.getClientRects().length);
      const index = focusable.indexOf(document.activeElement), next = (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
      e.preventDefault(); focusable[next].focus();
    }
    if (loading || done || document.activeElement !== canvas) return;
    if ((mode === "flight" || mode === "ring") && /^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) { e.preventDefault(); keys.add(e.code); }
    if (mode === "ring" && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); confirmRing(); }
  });
  document.addEventListener("keyup", e => keys.delete(e.code));
  addEventListener("blur", () => { keys.clear(); pointer = drag = null; });
  document.addEventListener("visibilitychange", () => { keys.clear(); pointer = drag = null; last = performance.now(); if (document.hidden) silence(); });
  addEventListener("resize", () => { if (mode) start(mode); });
})();
