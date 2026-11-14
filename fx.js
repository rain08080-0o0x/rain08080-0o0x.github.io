/* =========================================================
   fx.js — Ikuya Yamamoto Portfolio
   Hand-written WebGL background (domain-warped FBM nebula,
   perspective editor grid, mouse lens, click shockwave)
   + kinetic typography, HUD, cursor, tilt, reveal, filters.
   Dependency-free. Respects prefers-reduced-motion.
   ========================================================= */
(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  root.classList.add("js");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const isHome = body.classList.contains("home");
  const isProject = body.classList.contains("project-body");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const pointer = { x: innerWidth * 0.62, y: innerHeight * 0.45, sx: innerWidth * 0.62, sy: innerHeight * 0.45, moved: false };
  let scrollY = window.scrollY;

  /* -------------------------------------------------------
     1. WebGL background
     ------------------------------------------------------- */
  const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.0,1.0);}";
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uGrid;
uniform float uIntensity;
uniform vec3 uClick;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1.0,0.0)),u.x),mix(hash(i+vec2(0.0,1.0)),hash(i+vec2(1.0,1.0)),u.x),u.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=0.5;}
  return v;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/uRes.y;
  vec2 m=(uMouse-0.5*uRes)/uRes.y;
  float t=uTime*0.05;

  vec3 orange=vec3(1.0,0.36,0.13);
  vec3 cyan=vec3(0.2,0.85,1.0);
  vec3 violet=vec3(0.42,0.3,0.95);

  /* click shockwave */
  vec2 cp=(uClick.xy-0.5*uRes)/uRes.y;
  float ct=uTime-uClick.z;
  float rd=length(uv-cp);
  float front=ct*0.9;
  float wave=0.0;
  if(ct>0.0&&ct<2.5){wave=sin((rd-front)*38.0)*exp(-abs(rd-front)*14.0)*exp(-ct*1.6);}
  vec2 dir=rd>0.0001?(uv-cp)/rd:vec2(0.0);
  vec2 wuv=uv+dir*wave*0.03;

  /* mouse gravity lens */
  vec2 dm=wuv-m;
  float md=length(dm);
  wuv-=dm*0.35*exp(-md*md*10.0);

  /* domain-warped fbm nebula */
  vec2 p=wuv*1.5+vec2(0.0,uScroll*0.35);
  vec2 q=vec2(fbm(p+vec2(0.0,t)),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+3.5*q+vec2(1.7,9.2)+t*1.4),fbm(p+3.5*q+vec2(8.3,2.8)-t*1.2));
  float f=fbm(p+3.5*r);

  vec3 col=vec3(0.012,0.016,0.026);
  col=mix(col,violet*0.32,smoothstep(0.35,0.95,length(q)));
  col=mix(col,cyan*0.38,smoothstep(0.55,1.05,r.y)*0.85);
  col=mix(col,orange*0.95,smoothstep(0.62,1.0,f)*smoothstep(0.3,0.9,r.x));
  col*=0.35+1.1*f*f;
  col+=orange*0.10*exp(-md*md*6.0);

  /* twinkling stars */
  vec2 sp=uv*70.0+vec2(0.0,uScroll*20.0);
  vec2 sid=floor(sp);
  float sh=hash(sid);
  if(sh>0.986){
    vec2 sf=fract(sp)-0.5;
    float tw=0.5+0.5*sin(uTime*2.0+sh*300.0);
    col+=vec3(0.8,0.9,1.0)*smoothstep(0.12,0.0,length(sf))*tw*0.7;
  }

  /* perspective editor grid */
  float hz=-0.08+m.y*0.04-uScroll*0.25;
  float gridAmt=uGrid*(1.0-smoothstep(0.1,0.9,uScroll));
  if(gridAmt>0.001){
    float d=hz-uv.y;
    if(d>0.0){
      float z=0.32/d;
      vec2 gp=vec2((uv.x-m.x*0.15)*z*1.2,z+uTime*0.45);
      float wx=z*1.2/uRes.y*1.5;
      float wy=0.32/(d*d*uRes.y)*1.5;
      float lx=1.0-smoothstep(0.0,wx+0.012,abs(fract(gp.x+0.5)-0.5));
      float ly=1.0-smoothstep(0.0,wy+0.012,abs(fract(gp.y+0.5)-0.5));
      float g=max(lx*clamp(1.0-wx*2.5,0.0,1.0),ly*clamp(1.0-wy*2.5,0.0,1.0));
      vec3 gc=mix(cyan,orange,smoothstep(0.0,0.6,d));
      col*=mix(1.0,0.55,smoothstep(0.0,0.3,d)*gridAmt);
      col+=gc*g*0.55*gridAmt*smoothstep(0.0,0.08,d);
    }
    col+=orange*0.35*exp(-abs(uv.y-hz)*18.0)*gridAmt;
  }

  col+=orange*abs(wave)*0.35;
  col*=uIntensity*mix(1.0,0.55,smoothstep(0.0,1.6,uScroll));

  vec2 vq=gl_FragCoord.xy/uRes;
  col*=0.55+0.45*pow(16.0*vq.x*vq.y*(1.0-vq.x)*(1.0-vq.y),0.25);
  col=1.0-exp(-col*1.6);
  gl_FragColor=vec4(col,1.0);
}`;

  const GL = (() => {
    const canvas = document.createElement("canvas");
    canvas.className = "fx-canvas";
    canvas.setAttribute("aria-hidden", "true");
    let gl = null;
    try { gl = canvas.getContext("webgl", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" }); } catch (e) { gl = null; }
    if (!gl) { root.classList.add("no-webgl"); return null; }

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { root.classList.add("no-webgl"); return null; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { root.classList.add("no-webgl"); return null; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ["uRes", "uTime", "uMouse", "uScroll", "uGrid", "uIntensity", "uClick"].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    body.prepend(canvas);

    let quality = innerWidth < 700 ? 0.5 : 0.7;
    let sf = 1;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.floor(innerWidth * dpr * quality));
      const h = Math.max(1, Math.floor(innerHeight * dpr * quality));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      sf = w / innerWidth;
    };
    resize();
    addEventListener("resize", resize);

    const start = performance.now();
    let click = [0, 0, -100];
    addEventListener("pointerdown", e => {
      if (e.target.closest("a,button,input")) return;
      click = [e.clientX * sf, (innerHeight - e.clientY) * sf, (performance.now() - start) / 1000];
    });

    const grid = isHome ? 1 : 0;
    const intensity = isHome ? 1 : 0.75;

    const draw = (now) => {
      const time = reduced ? 12.0 : (now - start) / 1000;
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform2f(U.uMouse, pointer.sx * sf, (innerHeight - pointer.sy) * sf);
      gl.uniform1f(U.uScroll, scrollY / innerHeight);
      gl.uniform1f(U.uGrid, grid);
      gl.uniform1f(U.uIntensity, intensity);
      gl.uniform3f(U.uClick, click[0], click[1], click[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // adaptive quality
    let frames = 0, acc = 0, last = performance.now();
    const adapt = (now) => {
      const dt = now - last; last = now;
      if (dt > 100) return dt; // tab switch etc.
      acc += dt; frames++;
      if (frames >= 90) {
        const avg = acc / frames;
        if (avg > 24 && quality > 0.35) { quality = Math.max(0.35, quality - 0.1); resize(); }
        frames = 0; acc = 0;
      }
      return dt;
    };
    return { draw, adapt };
  })();

  /* -------------------------------------------------------
     2. Pointer tracking + HUD
     ------------------------------------------------------- */
  const hudPos = document.querySelector("[data-cursor-pos]");
  const hudFps = document.querySelector("[data-fps]");
  addEventListener("pointermove", e => {
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.moved = true;
    if (hudPos) hudPos.textContent = `${String(e.clientX).padStart(4, "0")}, ${String(e.clientY).padStart(4, "0")}`;
  }, { passive: true });

  /* -------------------------------------------------------
     3. Custom cursor
     ------------------------------------------------------- */
  let cursorDot = null, cursorRing = null;
  if (finePointer && !reduced) {
    cursorDot = document.createElement("div"); cursorDot.className = "cursor-dot";
    cursorRing = document.createElement("div"); cursorRing.className = "cursor-ring"; cursorRing.innerHTML = "<span>VIEW</span>";
    body.append(cursorDot, cursorRing);
    const ring = { x: pointer.x, y: pointer.y };
    addEventListener("pointermove", () => root.classList.add("has-cursor"), { once: true });
    document.addEventListener("mouseleave", () => root.classList.remove("has-cursor"));
    document.addEventListener("mouseenter", () => root.classList.add("has-cursor"));
    document.addEventListener("mouseover", e => {
      const card = e.target.closest(".work-card");
      const link = e.target.closest("a,button,[role=button],.gallery-stage");
      cursorRing.classList.toggle("is-view", !!card);
      cursorRing.classList.toggle("is-link", !card && !!link);
    });
    addEventListener("pointerdown", () => cursorRing.classList.add("is-down"));
    addEventListener("pointerup", () => cursorRing.classList.remove("is-down"));
    cursorDot._ring = ring;
  }

  /* -------------------------------------------------------
     4. Text effects: split chars + scramble
     ------------------------------------------------------- */
  let charIndex = 0;
  const splitNode = (node) => {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        [...child.textContent].forEach(ch => {
          if (/\s/.test(ch)) { frag.append(ch); return; }
          const s = document.createElement("span");
          s.className = "char"; s.textContent = ch; s.style.setProperty("--i", charIndex++);
          s.setAttribute("aria-hidden", "true");
          frag.append(s);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) {
        splitNode(child);
      }
    });
  };
  $$("[data-split]").forEach(splitNode);

  const GLYPHS = "!<>-_\\/[]{}=+*^?#$%&ABCDEFXYZ0123456789";
  const scramble = (el) => {
    if (reduced) return;
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    cancelAnimationFrame(el._sraf);
    let frame = 0;
    const dur = Math.min(28, 10 + final.length);
    const tick = () => {
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        if (ch === " " || ch === "/" || ch === "&") { out += ch; continue; }
        out += frame > (i / final.length) * dur + 3 ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (++frame < dur + 6) el._sraf = requestAnimationFrame(tick);
      else el.textContent = final;
    };
    tick();
  };
  $$("[data-scramble]").forEach(el => el.addEventListener("mouseenter", () => scramble(el)));

  /* reveal-text: wrap heading contents */
  $$(".reveal-text").forEach(el => {
    const inner = document.createElement("span");
    inner.className = "rt-inner";
    while (el.firstChild) inner.append(el.firstChild);
    el.append(inner);
  });

  /* -------------------------------------------------------
     5. Project page enhancements (DOM rendered by project-page.js)
     ------------------------------------------------------- */
  if (isProject) {
    const h1 = document.querySelector(".project-hero h1");
    if (h1) { h1.setAttribute("aria-label", h1.textContent); splitNode(h1); }
    $$("#project-hero > :not(h1)").forEach((el, i) => { el.classList.add("reveal"); el.style.setProperty("--d", `${0.35 + i * 0.1}s`); });
    $$(".gallery, .meta-list, .toc, .case-study .case-number, .case-study h2, .case-intro, .case-study .process-diagram, .case-grid article, .case-media").forEach(el => el.classList.add("reveal"));
    $$(".case-grid article").forEach((el, i) => { el.style.setProperty("--d", `${(i % 3) * 0.08}s`); el.setAttribute("data-spotlight", ""); });
    $$(".project-cta .button, .project-actions .button, .back-link").forEach(el => el.setAttribute("data-magnetic", ""));

    // TOC current section
    const tocItems = $$(".toc li");
    const cases = $$(".case-study");
    if (tocItems.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const idx = cases.indexOf(en.target);
          tocItems.forEach((li, i) => li.classList.toggle("current", i === idx));
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      cases.forEach(c => io.observe(c));
    }
  }

  /* -------------------------------------------------------
     6. Reveal observer + counters
     ------------------------------------------------------- */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduced) { el.textContent = target + suffix; return; }
    const t0 = performance.now(), dur = 1800;
    const step = (now) => {
      const k = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(2, -10 * k);
      el.textContent = String(Math.round(target * e)).padStart(2, "0") + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const startObserver = () => {
    $$(".work-card").forEach((c, i) => c.style.setProperty("--d", `${(i % 2) * 0.1}s`));
    const targets = $$(".reveal, .reveal-text, .work-card, [data-count], [data-scramble-view]");
    if (!("IntersectionObserver" in window)) { targets.forEach(t => t.classList.add("in")); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.classList.add("in");
        if (el.dataset.count) countUp(el);
        if (el.hasAttribute("data-scramble-view")) scramble(el);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach(t => io.observe(t));
  };

  /* -------------------------------------------------------
     7. Intro sequence (loader on first visit to home)
     ------------------------------------------------------- */
  const intro = () => {
    root.classList.add("is-ready");
    $$("[data-scramble-auto]").forEach(el => setTimeout(() => scramble(el), 250));
    startObserver();
  };

  const loader = document.querySelector(".loader");
  if (isHome && loader && !root.classList.contains("no-loader")) {
    const log = loader.querySelector(".loader-log");
    const count = loader.querySelector(".loader-count span");
    const bar = loader.querySelector(".loader-bar i");
    const lines = [
      "> init renderer ............ <b>OK</b>",
      "> compile shaders [GLSL] ... <b>OK</b>",
      "> load assets [14 projects]  <b>OK</b>",
      "> build scene graph ........ <b>OK</b>",
      "> bind input devices ....... <b>OK</b>",
      "> launching portfolio_"
    ];
    let loaded = document.readyState === "complete";
    addEventListener("load", () => { loaded = true; }, { once: true });
    const t0 = performance.now();
    const minDur = 1500, maxDur = 3200;
    const tick = (now) => {
      const el = now - t0;
      let k = clamp(el / minDur, 0, 1);
      if (!loaded && el < maxDur) k = Math.min(k, 0.92);
      const shown = Math.floor(k * lines.length);
      log.innerHTML = lines.slice(0, Math.max(1, shown)).join("\n");
      count.textContent = String(Math.floor(k * 100)).padStart(3, "0");
      bar.style.setProperty("--p", k);
      if (k < 1) requestAnimationFrame(tick);
      else {
        try { sessionStorage.setItem("iy-booted", "1"); } catch (e) {}
        setTimeout(() => { loader.classList.add("done"); setTimeout(intro, 350); }, 260);
      }
    };
    requestAnimationFrame(tick);
  } else {
    requestAnimationFrame(() => setTimeout(intro, 60));
  }

  /* -------------------------------------------------------
     8. Magnetic / tilt / spotlight
     ------------------------------------------------------- */
  if (finePointer && !reduced) {
    $$("[data-magnetic]").forEach(el => {
      el.style.transition = "transform .5s cubic-bezier(.16,1,.3,1)";
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.25}px, ${dy * 0.35}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });

    $$("[data-tilt]").forEach(el => {
      const max = el.classList.contains("hero-panel") ? 8 : el.classList.contains("featured") ? 3 : 5;
      el.addEventListener("pointermove", e => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = `perspective(1200px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
        el.style.setProperty("--gx", `${px * 100}%`);
        el.style.setProperty("--gy", `${py * 100}%`);
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }
  document.addEventListener("pointermove", e => {
    const el = e.target.closest && e.target.closest("[data-spotlight]");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  }, { passive: true });

  /* -------------------------------------------------------
     9. Works filter
     ------------------------------------------------------- */
  const filterBar = document.querySelector(".work-filter");
  if (filterBar) {
    const cards = $$(".work-card");
    filterBar.addEventListener("click", e => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      $$("button", filterBar).forEach(b => { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
      const f = btn.dataset.filter;
      let k = 0;
      cards.forEach(card => {
        const show = f === "all" || card.dataset.cat.split(" ").includes(f);
        card.classList.toggle("filtered-out", !show);
        card.classList.remove("pop");
        if (show) {
          card.classList.add("in");
          void card.offsetWidth;
          card.style.setProperty("--k", k++);
          card.classList.add("pop");
        }
      });
    });
  }

  /* -------------------------------------------------------
     10. Scroll-driven bits
     ------------------------------------------------------- */
  const header = document.querySelector(".site-header, .project-header");
  const progress = document.querySelector(".scroll-progress i") || (() => {
    const wrap = document.createElement("div");
    wrap.className = "scroll-progress"; wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = "<i></i>"; body.append(wrap);
    return wrap.firstChild;
  })();
  const timelines = $$("[data-timeline]");
  const bgNums = $$(".section-bg-num");
  let lastY = scrollY;

  const onScroll = () => {
    const vh = innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    progress.style.setProperty("--p", clamp(scrollY / max, 0, 1));
    if (header) {
      header.classList.toggle("scrolled", scrollY > 30);
      const down = scrollY > lastY;
      header.classList.toggle("hidden", down && scrollY > 500);
    }
    lastY = scrollY;
    timelines.forEach(tl => {
      const r = tl.getBoundingClientRect();
      const p = clamp((vh * 0.78 - r.top) / r.height, 0, 1);
      tl.style.setProperty("--tp", p);
      $$("li", tl).forEach(li => li.classList.toggle("lit", li.getBoundingClientRect().top < vh * 0.82));
    });
    if (!reduced) bgNums.forEach(n => {
      const r = n.parentElement.getBoundingClientRect();
      n.style.setProperty("--py", `${(r.top - vh / 2) * -0.12}px`);
    });
  };
  let scrollQueued = false;
  addEventListener("scroll", () => {
    scrollY = window.scrollY;
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      onScroll();
      if (reduced && GL) GL.draw(performance.now());
    });
  }, { passive: true });
  addEventListener("resize", onScroll);
  onScroll();

  /* -------------------------------------------------------
     11. Main loop
     ------------------------------------------------------- */
  let fpsAcc = 0, fpsFrames = 0, fpsLast = performance.now();
  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) requestAnimationFrame(loop);
  });

  function loop(now) {
    if (!running) return;
    // idle drift when there is no mouse (touch devices)
    if (!pointer.moved) {
      pointer.x = innerWidth * (0.6 + Math.sin(now / 4000) * 0.15);
      pointer.y = innerHeight * (0.45 + Math.cos(now / 5000) * 0.1);
    }
    pointer.sx = lerp(pointer.sx, pointer.x, 0.06);
    pointer.sy = lerp(pointer.sy, pointer.y, 0.06);

    if (cursorDot) {
      const ring = cursorDot._ring;
      ring.x = lerp(ring.x, pointer.x, 0.18);
      ring.y = lerp(ring.y, pointer.y, 0.18);
      cursorDot.style.transform = `translate3d(${pointer.x}px,${pointer.y}px,0)`;
      cursorRing.style.transform = `translate3d(${ring.x}px,${ring.y}px,0)${cursorRing.classList.contains("is-down") ? " scale(.8)" : ""}`;
    }

    if (GL) {
      GL.adapt(now);
      GL.draw(now);
    }

    fpsFrames++;
    if (now - fpsLast > 500) {
      fpsAcc = Math.round((fpsFrames * 1000) / (now - fpsLast));
      if (hudFps) hudFps.textContent = String(fpsAcc).padStart(2, "0");
      fpsFrames = 0; fpsLast = now;
    }
    requestAnimationFrame(loop);
  }

  if (reduced) {
    if (GL) GL.draw(performance.now());
  } else {
    requestAnimationFrame(loop);
  }
})();
