/* =========================================================
   portfolio-pixelfx.js — Fumiya Yamamoto Portfolio
   Live PixelFX engine (patch-gg/pixelfx, dual color + light
   buffers) + Custom Click-Effect Selector:
     1. Interactive Click-VFX Customizer: preview loops live,
        clicking anywhere in the preview spawns at cursor,
        and the chosen effect + palette becomes the active
        click effect across the entire portfolio (saved in
        localStorage).
     2. Live pixel-art stages on visual project cards, skill
        headers, award trophies, and project emblems.
     3. Bug Buster game VFX bridge.
   ========================================================= */
(() => {
  "use strict";

  const P = window.PixelFX;
  if (!P) return;

  const body = document.body;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  let loopActive = false;
  let lastTick = performance.now();
  let ow = 0, oh = 0, oframe = null, oimg = null;
  const activeBursts = [];
  const MAX_ACTIVE = 18;

  const STORAGE_EFFECT = "fy-click-vfx";
  const STORAGE_PALETTE = "fy-click-palette";

  /* Color ramps (dark -> white-hot) */
  const PALETTES = {
    ember: ["#1c0804", "#4d1508", "#942b0e", "#df4c18", "#ff7d29", "#ffb84d", "#ffe799", "#ffffff"],
    cyan: ["#04131e", "#0a2a42", "#124e78", "#1c82ba", "#2ec2f2", "#7be6ff", "#ccf8ff", "#ffffff"],
    violet: ["#120724", "#28114d", "#4b1f8c", "#7838d4", "#a864ff", "#d4a8ff", "#efe0ff", "#ffffff"],
    emerald: ["#051710", "#0b3624", "#146644", "#22a36c", "#42df95", "#8affc4", "#d6ffea", "#ffffff"],
    gold: ["#241404", "#543008", "#96580d", "#d68c16", "#ffc229", "#ffe469", "#fff7c2", "#ffffff"],
    crimson: ["#24050c", "#590d1a", "#9e192c", "#de3142", "#ff6368", "#ffa6a3", "#ffe0de", "#ffffff"],
  };

  /* Ambient looping effects for cards, badges & project headers */
  const STAGE_CATALOG = {
    "plasma-ball": P.plasmaBall,
    "hologram": P.hologram,
    "teleporter": P.teleporterPad,
    "energy-core": P.energyCore,
    "campfire": P.campfire,
    "brazier": P.brazier,
    "spirit-flame": P.spiritFlame,
    "portal": P.portal,
    "rune-circle": P.runeCircle,
    "arcane-orb": P.arcaneOrb,
    "gem-spin": P.gemSpin,
    "power-star": P.powerStar,
    "coin-spin": P.coinSpin,
    "crystal-shard": P.crystalShard,
    "xp-orb": P.xpOrb,
    "wisp": P.wisp,
  };

  /* User-selectable click effects (all one-shot bursts with crisp impact) */
  const CLICK_EFFECTS = {
    "mana-burst": {
      mod: P.manaBurst,
      label: "魔力バースト",
      en: "Mana Burst",
      cat: "ARCANE",
      desc: "魔力が一点に収束して弾け、発光するルーン文字と火花が周囲へ飛び散ります。",
      period: 1.55,
    },
    "crit-hit": {
      mod: P.critHit,
      label: "クリティカル",
      en: "Critical Hit",
      cat: "IMPACT",
      desc: "鋭い閃光と衝撃リングが炸裂し、破片が床で跳ねる打撃エフェクト。",
      period: 0.95,
    },
    "parry": {
      mod: P.parry,
      label: "パリィ閃光",
      en: "Parry Clash",
      cat: "IMPACT",
      desc: "刃が噛み合う十字の閃光と、弧を描いて降り注ぐ黄金の火花。",
      period: 1.05,
    },
    "plasma-explosion": {
      mod: P.plasmaExplosion,
      label: "プラズマ爆発",
      en: "Plasma Blast",
      cat: "SCI-FI",
      desc: "膨張するエネルギー球と多層のショックリング、周囲を走る電撃アーク。",
      period: 1.5,
    },
    "zap-hit": {
      mod: P.zapHit,
      label: "電撃スパーク",
      en: "Zap Spark",
      cat: "LIGHTNING",
      desc: "接触点から稲妻が四方へ弾け飛ぶ、キレの良い高電圧スパーク。",
      period: 0.9,
    },
    "lightning-strike": {
      mod: P.lightningStrike,
      label: "落雷",
      en: "Lightning Strike",
      cat: "LIGHTNING",
      desc: "上空から激しい雷光が突き刺さり、クリック地点に火花を散らします。",
      period: 1.8,
    },
    "snowflake-burst": {
      mod: P.snowflakeBurst,
      label: "氷華バースト",
      en: "Snowflake",
      cat: "ICE",
      desc: "六花の結晶と冷気の粒子が華やかに広がってきらめく氷結エフェクト。",
      period: 1.8,
    },
    "collect-burst": {
      mod: P.collectBurst,
      label: "スター回収",
      en: "Star Collect",
      cat: "PICKUP",
      desc: "十字のきらめきと光の輪が広がり、星粒が弧を描いて舞う軽快な演出。",
      period: 1.25,
    },
    "cartoon-pow": {
      mod: P.cartoonPow,
      label: "コミックPOW",
      en: "Comic Pow",
      cat: "COMIC",
      desc: "ポップな衝撃スターと煙が弾けるカートゥーン調のヒット演出。",
      period: 1.05,
    },
    "confetti": {
      mod: P.confetti,
      label: "紙吹雪",
      en: "Confetti",
      cat: "FESTIVE",
      desc: "クラッカーが弾け、色とりどりの紙吹雪とリボンがひらひら舞い落ちます。",
      period: 2.2,
    },
    "off": {
      mod: null,
      label: "OFF（なし）",
      en: "Disabled",
      cat: "NONE",
      desc: "クリック時のピクセルエフェクトを無効化します。",
      period: 1,
    },
  };

  /* Extra one-shots for game / system hooks */
  const ONESHOTS = {
    "hit-spark": P.hitSpark,
    "crit-hit": P.critHit,
    "parry": P.parry,
    "plasma-explosion": P.plasmaExplosion,
    "firework-burst": P.fireworkBurst,
    "cartoon-pow": P.cartoonPow,
    "collect-burst": P.collectBurst,
    "mana-burst": P.manaBurst,
    "lightning-strike": P.lightningStrike,
    "zap-hit": P.zapHit,
    "snowflake-burst": P.snowflakeBurst,
    "healing-bloom": P.healingBloom,
    "dark-explosion": P.darkExplosion,
    "confetti": P.confetti,
    "poof": P.poof,
  };

  /* Persisted user selection */
  let selectedClickEffect = "mana-burst";
  let selectedClickPalette = "default";
  try {
    const savedFx = localStorage.getItem(STORAGE_EFFECT);
    const savedPal = localStorage.getItem(STORAGE_PALETTE);
    if (savedFx && CLICK_EFFECTS[savedFx]) selectedClickEffect = savedFx;
    if (savedPal && (savedPal === "default" || PALETTES[savedPal])) selectedClickPalette = savedPal;
  } catch (e) {}

  const syncGlobalFlag = () => {
    // Tell fx.js whether PixelFX owns click visuals so they don't clash
    window.__pfxClickActive = selectedClickEffect !== "off";
  };
  syncGlobalFlag();

  /* -------------------------------------------------------
     1. Looping ambient stages (cards, badges, project headers)
     ------------------------------------------------------- */
  const stages = [];

  function mountStage(host, config = {}) {
    const key = config.effect || host.dataset.pfx || "hologram";
    const mod = STAGE_CATALOG[key] || P.hologram;
    if (!mod || !mod.meta) return null;

    const padX = config.padX ?? 6;
    const padY = config.padY ?? 6;
    const [mw, mh] = mod.meta.size;
    const [ox, oy] = mod.meta.origin;
    const fw = mw + padX * 2;
    const fh = mh + padY * 2;

    const canvas = document.createElement("canvas");
    canvas.className = "pfx-stage-canvas";
    canvas.width = fw;
    canvas.height = fh;
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = false;

    const paletteName = config.palette || host.dataset.pfxPalette || "";
    const light = Number(config.light || host.dataset.pfxLight || 1.08);
    const opts = {
      x: ox + padX,
      y: oy + padY,
      light,
      seed: mod.meta.options?.seed ?? 3,
    };
    if (paletteName && PALETTES[paletteName]) opts.palette = PALETTES[paletteName];

    const fx = P.createFx(mod, opts);
    fx.update(Math.random() * 1.4 + 0.3);

    const stage = {
      host,
      canvas,
      ctx,
      frame: P.createFrame(fw, fh),
      img: ctx.createImageData(fw, fh),
      fx,
      light,
      bursts: [],
      visible: true,
      acc: 0,
      fps: config.fps || 30,
      triggerBurst(oneShotKey = "collect-burst") {
        const bm = ONESHOTS[oneShotKey] || P.collectBurst;
        if (!bm) return;
        const bOpts = {
          x: Math.round(fw * 0.5),
          y: Math.round(fh * 0.62),
          light: 1.15,
          seed: Math.floor(Math.random() * 999) + 1,
        };
        if (paletteName && PALETTES[paletteName]) bOpts.palette = PALETTES[paletteName];
        this.bursts.push(P.createFx(bm, bOpts));
        ensureLoop();
      },
      step(dt) {
        if (dt > 0) {
          this.fx.update(dt);
          for (let i = this.bursts.length - 1; i >= 0; i--) {
            this.bursts[i].update(dt);
            if (this.bursts[i].done()) this.bursts.splice(i, 1);
          }
        }
        P.clearFrame(this.frame);
        this.fx.draw(this.frame);
        for (let i = 0; i < this.bursts.length; i++) this.bursts[i].draw(this.frame);
        P.composite(this.frame, this.img.data, null, this.light);
        this.ctx.putImageData(this.img, 0, 0);
      },
    };

    host.prepend(canvas);
    host.classList.add("has-pfx");
    stage.step(0);
    stages.push(stage);
    return stage;
  }

  document.querySelectorAll("[data-pfx]").forEach(el => mountStage(el));

  if ("IntersectionObserver" in window && stages.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        const st = stages.find(s => s.host === en.target);
        if (st) st.visible = en.isIntersecting;
      });
      ensureLoop();
    }, { rootMargin: "160px 0px" });
    stages.forEach(s => io.observe(s.host));
  }

  document.querySelectorAll(".work-card").forEach(card => {
    const stageHost = card.querySelector("[data-pfx]");
    if (!stageHost) return;
    const st = stages.find(s => s.host === stageHost);
    if (!st) return;
    card.addEventListener("pointerenter", () => st.triggerBurst("collect-burst"));
  });

  /* -------------------------------------------------------
     2. Interactive Click-Effect Selector & Live Preview Stage
     ------------------------------------------------------- */
  let previewBox = null;
  const labRoot = document.querySelector("[data-pfx-lab]");
  if (labRoot) {
    const viewport = labRoot.querySelector("[data-pfx-viewport]");
    const titleEl = labRoot.querySelector("[data-pfx-title]");
    const catEl = labRoot.querySelector("[data-pfx-cat]");
    const descEl = labRoot.querySelector("[data-pfx-desc]");
    const statusEl = labRoot.querySelector("[data-pfx-status]");
    const presetBar = labRoot.querySelector("[data-pfx-presets]");
    const palBar = labRoot.querySelector("[data-pfx-palettes]");

    const PW = 240, PH = 168;
    const pCanvas = document.createElement("canvas");
    pCanvas.className = "pfx-stage-canvas pfx-preview-canvas";
    pCanvas.width = PW;
    pCanvas.height = PH;
    pCanvas.setAttribute("aria-hidden", "true");
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) pCtx.imageSmoothingEnabled = false;
    if (viewport) viewport.prepend(pCanvas);

    previewBox = {
      host: viewport,
      canvas: pCanvas,
      ctx: pCtx,
      frame: P.createFrame(PW, PH),
      img: pCtx ? pCtx.createImageData(PW, PH) : null,
      instances: [],
      autoTimer: 0,
      visible: true,
      acc: 0,
      spawnAt(nx = 0.5, ny = 0.58) {
        const info = CLICK_EFFECTS[selectedClickEffect];
        if (!info || !info.mod) {
          this.instances = [];
          if (this.ctx) this.ctx.clearRect(0, 0, PW, PH);
          return;
        }
        const m = info.mod;
        const [mw, mh] = m.meta.size;
        const [ox, oy] = m.meta.origin;
        // Center the visual body of the effect around (nx, ny)
        const offsetX = ox - mw * 0.5;
        const offsetY = oy - mh * 0.52;
        const px = Math.round(clamp(nx, 0.15, 0.85) * PW + offsetX * 0.65);
        const py = Math.round(clamp(ny, 0.2, 0.85) * PH + offsetY * 0.65);
        const opts = {
          x: px,
          y: py,
          light: 1.2,
          seed: Math.floor(Math.random() * 4096) + 1,
        };
        if (selectedClickPalette !== "default" && PALETTES[selectedClickPalette]) {
          opts.palette = PALETTES[selectedClickPalette];
        }
        if (this.instances.length >= 6) this.instances.shift();
        this.instances.push(P.createFx(m, opts));
        this.autoTimer = 0;
        ensureLoop();
      },
      step(dt) {
        if (!this.ctx || !this.img) return;
        const info = CLICK_EFFECTS[selectedClickEffect];
        if (!info || !info.mod) {
          this.ctx.clearRect(0, 0, PW, PH);
          return;
        }
        this.autoTimer += dt;
        // Continuously auto-demonstrate the selected click effect so it is always visibly alive!
        if (this.autoTimer >= info.period || (this.instances.length === 0 && this.autoTimer > 0.12)) {
          this.spawnAt(0.5 + (Math.random() - 0.5) * 0.16, 0.56 + (Math.random() - 0.5) * 0.1);
        }
        P.clearFrame(this.frame);
        for (let i = this.instances.length - 1; i >= 0; i--) {
          const inst = this.instances[i];
          inst.update(dt);
          inst.draw(this.frame);
          if (inst.done()) this.instances.splice(i, 1);
        }
        P.composite(this.frame, this.img.data, null, 1.18);
        this.ctx.putImageData(this.img, 0, 0);
      },
    };

    if ("IntersectionObserver" in window && viewport) {
      const pio = new IntersectionObserver(entries => {
        entries.forEach(en => { previewBox.visible = en.isIntersecting; });
        ensureLoop();
      }, { rootMargin: "160px 0px" });
      pio.observe(viewport);
    }

    const palChoices = [
      ["default", "Original", "linear-gradient(135deg,#ff7d29,#35e0ff)"],
      ["ember", "Ember", "#ff6a24"],
      ["cyan", "Cyan", "#35e0ff"],
      ["violet", "Arcane", "#a864ff"],
      ["emerald", "Matrix", "#42df95"],
      ["gold", "Solar", "#ffd23f"],
      ["crimson", "Crimson", "#ff4d5a"],
    ];

    const palLabelMap = Object.fromEntries(palChoices.map(([id, name]) => [id, name]));

    const updateUI = () => {
      const info = CLICK_EFFECTS[selectedClickEffect] || CLICK_EFFECTS["mana-burst"];
      if (titleEl) titleEl.textContent = `${info.label} (${info.en})`;
      if (catEl) catEl.textContent = info.cat;
      if (descEl) descEl.textContent = info.desc;
      if (statusEl) {
        statusEl.textContent = selectedClickEffect === "off"
          ? "CLICK VFX : OFF"
          : `ACTIVE : ${info.label} · ${palLabelMap[selectedClickPalette] || "Original"}`;
      }
      if (presetBar) {
        presetBar.querySelectorAll(".pfx-chip").forEach(b => {
          const on = b.dataset.key === selectedClickEffect;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      if (palBar) {
        palBar.querySelectorAll(".pfx-swatch").forEach(b => {
          const on = b.dataset.pal === selectedClickPalette;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
    };

    if (presetBar) {
      Object.entries(CLICK_EFFECTS).forEach(([key, info]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pfx-chip" + (key === "off" ? " pfx-chip-off" : "");
        btn.dataset.key = key;
        btn.textContent = info.label;
        btn.addEventListener("click", e => {
          e.stopPropagation();
          selectedClickEffect = key;
          syncGlobalFlag();
          try { localStorage.setItem(STORAGE_EFFECT, key); } catch (err) {}
          previewBox.instances = [];
          previewBox.spawnAt(0.5, 0.56);
          // Also pop at the button itself so the user immediately feels the new click VFX!
          const r = btn.getBoundingClientRect();
          spawnUserClickFx(r.left + r.width / 2, r.top + r.height / 2);
          updateUI();
        });
        presetBar.append(btn);
      });
    }

    if (palBar) {
      palChoices.forEach(([id, name, swatch]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "pfx-swatch";
        btn.dataset.pal = id;
        btn.title = `カラー: ${name}`;
        btn.setAttribute("aria-label", `${name} カラー`);
        btn.style.setProperty("--sw", swatch);
        btn.addEventListener("click", e => {
          e.stopPropagation();
          selectedClickPalette = id;
          try { localStorage.setItem(STORAGE_PALETTE, id); } catch (err) {}
          previewBox.instances = [];
          previewBox.spawnAt(0.5, 0.56);
          const r = btn.getBoundingClientRect();
          spawnUserClickFx(r.left + r.width / 2, r.top + r.height / 2);
          updateUI();
        });
        palBar.append(btn);
      });
    }

    if (viewport) {
      viewport.addEventListener("pointerdown", e => {
        e.stopPropagation();
        const r = viewport.getBoundingClientRect();
        const nx = (e.clientX - r.left) / Math.max(1, r.width);
        const ny = (e.clientY - r.top) / Math.max(1, r.height);
        previewBox.spawnAt(nx, ny);
      });
      viewport.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          previewBox.spawnAt(0.5, 0.56);
        }
      });
    }

    updateUI();
    previewBox.spawnAt(0.5, 0.56);
  }

  /* -------------------------------------------------------
     3. Global PixelFX Overlay (User Click Effect + Game VFX)
     ------------------------------------------------------- */
  const PIXEL_SCALE = 3;
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.className = "pfx-overlay";
  overlayCanvas.setAttribute("aria-hidden", "true");
  const octx = overlayCanvas.getContext("2d");

  const resizeOverlay = () => {
    ow = Math.max(64, Math.ceil(innerWidth / PIXEL_SCALE));
    oh = Math.max(64, Math.ceil(innerHeight / PIXEL_SCALE));
    overlayCanvas.width = ow;
    overlayCanvas.height = oh;
    if (octx) octx.imageSmoothingEnabled = false;
    oframe = P.createFrame(ow, oh);
    oimg = octx ? octx.createImageData(ow, oh) : null;
  };

  if (octx) {
    resizeOverlay();
    body.append(overlayCanvas);
    addEventListener("resize", resizeOverlay);
  }

  function spawnScreenFx(name, clientX, clientY, opts = {}) {
    if (!octx || !oframe) return;
    const mod = ONESHOTS[name] || CLICK_EFFECTS[name]?.mod || STAGE_CATALOG[name];
    if (!mod || !mod.meta) return;
    if (activeBursts.length >= MAX_ACTIVE) activeBursts.shift();

    // Align the visual center of the effect with the click point
    const [mw, mh] = mod.meta.size;
    const [ox, oy] = mod.meta.origin;
    const shiftX = Math.round((ox - mw * 0.5) * 0.65);
    const shiftY = Math.round((oy - mh * 0.52) * 0.65);

    const px = Math.round(clientX / PIXEL_SCALE) + shiftX;
    const py = Math.round(clientY / PIXEL_SCALE) + shiftY;
    const fxOpts = {
      x: px,
      y: py,
      angle: opts.angle ?? 0,
      flip: !!opts.flip,
      light: opts.light ?? 1.18,
      seed: opts.seed ?? (Math.floor(Math.random() * 4096) + 1),
    };
    if (opts.palette && PALETTES[opts.palette]) fxOpts.palette = PALETTES[opts.palette];
    else if (Array.isArray(opts.palette)) fxOpts.palette = opts.palette;

    activeBursts.push(P.createFx(mod, fxOpts));
    ensureLoop();
  }

  function spawnUserClickFx(clientX, clientY) {
    if (selectedClickEffect === "off") return;
    const opts = { light: 1.2 };
    if (selectedClickPalette !== "default" && PALETTES[selectedClickPalette]) {
      opts.palette = selectedClickPalette;
    }
    if (selectedClickEffect === "hit-spark" || selectedClickEffect === "zap-hit") {
      opts.angle = (Math.random() - 0.5) * 0.9;
    }
    spawnScreenFx(selectedClickEffect, clientX, clientY, opts);
  }

  /* Global pointerdown spawns the user's chosen click effect anywhere on the site */
  addEventListener("pointerdown", e => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (body.classList.contains("game-playing")) return;
    if (e.target.closest && e.target.closest("[data-pfx-viewport], [data-pfx-presets], [data-pfx-palettes]")) return;
    spawnUserClickFx(e.clientX, e.clientY);
  }, { passive: true });

  /* Award badge hover celebration */
  document.querySelectorAll(".awards-block .timeline li, .work-award, .project-award").forEach(el => {
    let lastAt = 0;
    el.addEventListener("pointerenter", () => {
      const now = performance.now();
      if (now - lastAt < 1800) return;
      lastAt = now;
      const r = el.getBoundingClientRect();
      spawnScreenFx("confetti", r.left + Math.min(r.width * 0.5, 90), r.top + r.height * 0.6, { light: 1.05 });
    });
  });

  /* Bug Buster game bridge */
  let lastHitFx = 0;
  let lastLetterFx = 0;
  window.PortfolioPixelFX = {
    spawn: spawnScreenFx,
    enemyHit(x, y, isCrit = false) {
      const now = performance.now();
      if (now - lastHitFx < 55) return;
      lastHitFx = now;
      spawnScreenFx(isCrit ? "crit-hit" : "hit-spark", x, y, {
        palette: isCrit ? "gold" : "cyan",
        angle: (Math.random() - 0.5) * 1.2,
      });
    },
    enemyKill(x, y, isElite = false) {
      spawnScreenFx(isElite ? "plasma-explosion" : "poof", x, y, {
        palette: isElite ? "ember" : "violet",
        light: isElite ? 1.25 : 1.0,
      });
    },
    letterBreak(x, y) {
      const now = performance.now();
      if (now - lastLetterFx < 90) return;
      lastLetterFx = now;
      spawnScreenFx("collect-burst", x, y, { palette: "cyan", light: 0.95 });
    },
    playerHurt(x, y) {
      spawnScreenFx("crit-hit", x, y, { palette: "crimson", light: 1.25 });
    },
    waveClear() {
      spawnScreenFx("confetti", innerWidth * 0.3, innerHeight * 0.42, { light: 1.15 });
      spawnScreenFx("confetti", innerWidth * 0.7, innerHeight * 0.42, { light: 1.15 });
      spawnScreenFx("mana-burst", innerWidth * 0.5, innerHeight * 0.38, { palette: "gold", light: 1.2 });
    },
    upgradePick(el, rarity = "normal") {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pal = rarity === "rare" ? "gold" : rarity === "uncommon" ? "cyan" : "emerald";
      spawnScreenFx(rarity === "rare" ? "mana-burst" : "parry", r.left + r.width / 2, r.top + r.height / 2, {
        palette: pal,
        light: 1.2,
      });
    },
  };

  /* -------------------------------------------------------
     4. Unified 30fps scheduler (runs regardless of OS setting
        so live pixel stages and user-selected click VFX animate)
     ------------------------------------------------------- */
  function ensureLoop() {
    if (loopActive) return;
    loopActive = true;
    lastTick = performance.now();
    requestAnimationFrame(tickAll);
  }

  function tickAll(now) {
    if (document.hidden) {
      loopActive = false;
      return;
    }
    const dt = clamp((now - lastTick) / 1000, 0.001, 0.06);
    lastTick = now;

    let keepAlive = false;
    const pausedByGame = body.classList.contains("game-playing");

    if (!pausedByGame) {
      // Ambient stages
      for (let i = 0; i < stages.length; i++) {
        const st = stages[i];
        if (!st.visible) continue;
        keepAlive = true;
        st.acc += dt;
        if (st.acc >= 1 / st.fps) {
          const adv = Math.min(st.acc, 0.08);
          st.acc = 0;
          st.step(adv);
        }
      }

      // Click-effect live preview stage
      if (previewBox && previewBox.visible && selectedClickEffect !== "off") {
        keepAlive = true;
        previewBox.acc += dt;
        if (previewBox.acc >= 1 / 30) {
          const adv = Math.min(previewBox.acc, 0.08);
          previewBox.acc = 0;
          previewBox.step(adv);
        }
      }
    }

    // Screen-wide click & game bursts (stepped every frame for crisp responsiveness)
    if (activeBursts.length > 0 && octx && oframe && oimg) {
      keepAlive = true;
      P.clearFrame(oframe);
      for (let i = activeBursts.length - 1; i >= 0; i--) {
        const b = activeBursts[i];
        b.update(dt);
        b.draw(oframe);
        if (b.done()) activeBursts.splice(i, 1);
      }
      P.composite(oframe, oimg.data, null, 1.15);
      octx.putImageData(oimg, 0, 0);
      overlayCanvas._hadPixels = true;
    } else if (octx && overlayCanvas._hadPixels) {
      octx.clearRect(0, 0, ow, oh);
      overlayCanvas._hadPixels = false;
    }

    if (keepAlive) {
      requestAnimationFrame(tickAll);
    } else {
      loopActive = false;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) ensureLoop();
  });
  addEventListener("scroll", ensureLoop, { passive: true });
  ensureLoop();
})();
