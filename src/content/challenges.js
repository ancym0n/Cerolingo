(() => {
  const nativeLog =
    window[Symbol.for("cerolingo.log")] || console.log.bind(console);

  function cLog(title, text, ...extra) {
    nativeLog(
      `%c Cerolingo · ${title} %c ${text} `,
      "background: #6877fe; color: #e7ecff; padding: 3px 6px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: sans-serif;",
      "background: #a1b2ff; color: #454faa; padding: 3px 6px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: sans-serif;",
      ...extra,
    );
  }

  cLog("challenges.js", "loaded");

  let isSolvingChallenge = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = (base, spread = 14) =>
    Math.max(10, Math.round(base + (Math.random() - 0.5) * spread));

  const isFxEnabled = () => localStorage.getItem("botHighlight") !== "false";

  // Virtual cursor and solving visual effects
  const CURSOR_ID = "cerolingoVirtualCursor";
  const SOLVING_BAR_ID = "cerolingoSolvingBar";
  const CURSOR_IDLE_MS = 380;
  const SOLVING_IDLE_MS = 460;

  function ensureSolvingBar() {
    let bar = document.getElementById(SOLVING_BAR_ID);
    if (!bar && document.body) {
      bar = document.createElement("div");
      bar.id = SOLVING_BAR_ID;
      document.body.appendChild(bar);
    }
    return bar;
  }

  function markSolvingActive() {
    if (!isFxEnabled() || !document.body) return;
    const now = Date.now();
    document.body.dataset.cerolingoSolving = "true";
    document.body.dataset.cerolingoSolvingAt = String(now);
    const bar = ensureSolvingBar();
    if (bar) bar.classList.add("is-active");

    setTimeout(() => {
      if (!document.body) return;
      const last = Number(document.body.dataset.cerolingoSolvingAt || 0);
      if (Date.now() - last >= SOLVING_IDLE_MS - 15) {
        delete document.body.dataset.cerolingoSolving;
        const b = document.getElementById(SOLVING_BAR_ID);
        if (b) b.classList.remove("is-active");
      }
    }, SOLVING_IDLE_MS);
  }

  function createSvgEl(tag, attrs = {}) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) {
      el.setAttribute(k, String(v));
    }
    return el;
  }

  function ensureVirtualCursor() {
    let cursor = document.getElementById(CURSOR_ID);
    if (cursor && cursor.dataset.v === "2") return cursor;
    if (cursor) cursor.remove();
    if (!document.body) return null;

    cursor = document.createElement("div");
    cursor.id = CURSOR_ID;
    cursor.dataset.v = "2";
    cursor.setAttribute("data-mode", "click");

    const tilt = document.createElement("div");
    tilt.className = "cerolingo-cursor-tilt";

    const inner = document.createElement("div");
    inner.className = "cerolingo-cursor-inner";

    const halo = document.createElement("div");
    halo.className = "cerolingo-cursor-halo";

    // 3D pointer SVG
    const pointerD =
      "M10.2 5.4 C7.0 3.8 4.1 6.7 5.5 9.9 L14.4 31.8 C15.7 35.0 20.1 35.1 21.7 32.1 L24.8 26.2 L31.6 24.1 C34.9 23.0 35.4 18.6 32.3 16.9 Z";
    const svg = createSvgEl("svg", {
      viewBox: "0 0 42 42",
      width: 44,
      height: 44,
      class: "cerolingo-cursor-svg",
    });
    svg.appendChild(
      createSvgEl("path", {
        class: "cerolingo-cursor-shadow-path",
        transform: "translate(0, 3.8)",
        d: pointerD,
      }),
    );
    svg.appendChild(
      createSvgEl("path", {
        class: "cerolingo-cursor-body-path",
        d: pointerD,
      }),
    );
    svg.appendChild(
      createSvgEl("path", {
        class: "cerolingo-cursor-shine-path",
        d: "M12.6 10.6 L25.6 17.6",
      }),
    );

    // Action mode badge
    const badge = document.createElement("div");
    badge.className = "cerolingo-cursor-badge";

    const typingSpan = document.createElement("span");
    typingSpan.className = "cerolingo-badge-typing";
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("i");
      dot.className = "cerolingo-badge-dot";
      typingSpan.appendChild(dot);
    }

    const micSpan = document.createElement("span");
    micSpan.className = "cerolingo-badge-mic";
    const micSvg = createSvgEl("svg", {
      viewBox: "0 0 24 24",
      class: "cerolingo-badge-icon",
    });
    micSvg.appendChild(
      createSvgEl("rect", {
        x: 9,
        y: 3,
        width: 6,
        height: 11,
        rx: 3,
        fill: "#ffffff",
      }),
    );
    micSvg.appendChild(
      createSvgEl("path", {
        d: "M5 11a7 7 0 0 0 14 0 M12 18v3",
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 2.4,
        "stroke-linecap": "round",
      }),
    );
    micSvg.appendChild(
      createSvgEl("path", {
        d: "M4 4L20 20",
        fill: "none",
        stroke: "#fff2f2",
        "stroke-width": 2.8,
        "stroke-linecap": "round",
      }),
    );
    micSpan.appendChild(micSvg);

    const listenSpan = document.createElement("span");
    listenSpan.className = "cerolingo-badge-listen";
    for (let i = 0; i < 3; i++) {
      const bar = document.createElement("i");
      bar.className = "cerolingo-badge-bar";
      listenSpan.appendChild(bar);
    }

    const matchSpan = document.createElement("span");
    matchSpan.className = "cerolingo-badge-match";
    const matchSvg = createSvgEl("svg", {
      viewBox: "0 0 24 24",
      class: "cerolingo-badge-icon",
    });
    matchSvg.appendChild(
      createSvgEl("rect", {
        x: 2.5,
        y: 8,
        width: 10.5,
        height: 8,
        rx: 4,
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 2.7,
      }),
    );
    matchSvg.appendChild(
      createSvgEl("rect", {
        x: 11,
        y: 8,
        width: 10.5,
        height: 8,
        rx: 4,
        fill: "none",
        stroke: "#7bffd0",
        "stroke-width": 2.7,
      }),
    );
    matchSpan.appendChild(matchSvg);

    const confirmSpan = document.createElement("span");
    confirmSpan.className = "cerolingo-badge-confirm";
    const confirmSvg = createSvgEl("svg", {
      viewBox: "0 0 24 24",
      class: "cerolingo-badge-icon",
    });
    confirmSvg.appendChild(
      createSvgEl("path", {
        d: "M5 13l4.5 4.5L19 7.5",
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 3,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
      }),
    );
    confirmSpan.appendChild(confirmSvg);

    badge.append(typingSpan, micSpan, listenSpan, matchSpan, confirmSpan);
    inner.append(halo, svg, badge);
    tilt.appendChild(inner);
    cursor.appendChild(tilt);

    const startX = Math.round(window.innerWidth * 0.5);
    const startY = Math.round(window.innerHeight * 0.62);
    cursor.dataset.x = String(startX);
    cursor.dataset.y = String(startY);
    cursor.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;

    document.body.appendChild(cursor);
    return cursor;
  }

  function hideBotVisuals() {
    const cursor = document.getElementById(CURSOR_ID);
    if (cursor) {
      cursor.classList.remove("is-visible", "is-pressing");
      cursor.setAttribute("data-mode", "click");
    }
    const bar = document.getElementById(SOLVING_BAR_ID);
    if (bar) {
      bar.classList.remove("is-active");
    }
    if (document.body) {
      delete document.body.dataset.cerolingoSolving;
    }
  }

  function spawnMotionTrail(x1, y1, x2, y2, glideMs) {
    if (!isFxEnabled() || !document.body) return;
    const steps = [0.28, 0.56, 0.8];
    steps.forEach((t, idx) => {
      setTimeout(() => {
        if (!isFxEnabled() || !document.body) return;
        const dot = document.createElement("div");
        dot.className = "cerolingo-fx-trail";
        dot.style.left = `${Math.round(x1 + (x2 - x1) * t)}px`;
        dot.style.top = `${Math.round(y1 + (y2 - y1) * t)}px`;
        document.body.appendChild(dot);
        const cleanup = () => dot.remove();
        dot.addEventListener("animationend", cleanup, { once: true });
        setTimeout(cleanup, 280);
      }, Math.round(glideMs * t * 0.55) + idx * 14);
    });
  }

  function moveVirtualCursorTo(x, y, mode = "click") {
    if (!isFxEnabled()) return 0;
    const cursor = ensureVirtualCursor();
    if (!cursor) return 0;

    const prevX = Number(cursor.dataset.x ?? x);
    const prevY = Number(cursor.dataset.y ?? y);
    const dx = x - prevX;
    const dy = y - prevY;
    const dist = Math.hypot(dx, dy);
    const wasVisible = cursor.classList.contains("is-visible");

    cursor.setAttribute("data-mode", mode);

    const glideMs = wasVisible
      ? Math.round(Math.min(148, Math.max(66, dist * 0.19)))
      : 82;

    if (!wasVisible) {
      const spawnX = Math.round(x + 34);
      const spawnY = Math.round(y + 28);
      cursor.style.transitionDuration = "0ms, 240ms";
      cursor.style.transform = `translate3d(${spawnX}px, ${spawnY}px, 0)`;
      void cursor.offsetWidth;
    } else if (dist > 135) {
      spawnMotionTrail(prevX, prevY, x, y, glideMs);
    }

    const tiltEl = cursor.querySelector(".cerolingo-cursor-tilt");
    if (tiltEl) {
      const tiltDeg = wasVisible
        ? Math.max(-13, Math.min(13, dx * 0.032))
        : -6;
      tiltEl.style.setProperty("--cerolingo-tilt", `${tiltDeg.toFixed(1)}deg`);
      setTimeout(() => {
        if (tiltEl.isConnected) {
          tiltEl.style.setProperty("--cerolingo-tilt", "0deg");
        }
      }, Math.max(45, glideMs - 8));
    }

    cursor.dataset.x = String(Math.round(x));
    cursor.dataset.y = String(Math.round(y));
    const now = Date.now();
    cursor.dataset.lastActiveAt = String(now);

    cursor.style.transitionDuration = `${glideMs}ms, 240ms`;
    cursor.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
    cursor.classList.add("is-visible");

    setTimeout(() => {
      const live = document.getElementById(CURSOR_ID);
      if (!live) return;
      const last = Number(live.dataset.lastActiveAt || 0);
      if (Date.now() - last >= CURSOR_IDLE_MS - 15) {
        live.classList.remove("is-visible", "is-pressing");
        live.setAttribute("data-mode", "click");
      }
    }, CURSOR_IDLE_MS);

    return glideMs;
  }

  function pulseCursorPress() {
    const cursor = document.getElementById(CURSOR_ID);
    if (!cursor) return;
    cursor.classList.remove("is-pressing");
    void cursor.offsetWidth;
    cursor.classList.add("is-pressing");
    setTimeout(() => {
      cursor.classList.remove("is-pressing");
    }, 95);
  }

  function spawnClickBurst(x, y, mode = "click") {
    if (!isFxEnabled() || !document.body) return;
    const burst = document.createElement("div");
    burst.className = `cerolingo-fx-burst cerolingo-fx-burst-${mode}`;
    burst.style.left = `${Math.round(x)}px`;
    burst.style.top = `${Math.round(y)}px`;

    const ring = document.createElement("div");
    ring.className = "cerolingo-fx-burst-ring";
    burst.appendChild(ring);

    const baseAngle = Math.round((Math.random() - 0.5) * 24);
    for (let i = 0; i < 6; i++) {
      const spark = document.createElement("div");
      spark.className = "cerolingo-fx-spark";
      spark.style.setProperty("--spark-angle", `${baseAngle + i * 60}deg`);
      burst.appendChild(spark);
    }

    document.body.appendChild(burst);
    setTimeout(() => burst.remove(), 410);
  }

  function spawnMatchLink(el1, el2) {
    if (!el1 || !el2 || !isFxEnabled() || !document.body) return;
    const r1 = el1.getBoundingClientRect();
    const r2 = el2.getBoundingClientRect();
    if (r1.width < 4 || r2.width < 4) return;

    const x1 = r1.left + r1.width * 0.5;
    const y1 = r1.top + r1.height * 0.5;
    const x2 = r2.left + r2.width * 0.5;
    const y2 = r2.top + r2.height * 0.5;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const mx = (x1 + x2) * 0.5;
    const my = (y1 + y2) * 0.5 - Math.min(36, dist * 0.14);
    const d = `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    const approxLen = Math.round(dist * 1.15) + 20;

    const svg = createSvgEl("svg", { class: "cerolingo-fx-match-line" });
    const outer = createSvgEl("path", { class: "cerolingo-fx-match-path", d });
    outer.style.setProperty("--line-len", String(approxLen));
    const core = createSvgEl("path", {
      class: "cerolingo-fx-match-path-core",
      d,
    });
    core.style.setProperty("--line-len", String(approxLen));

    svg.append(outer, core);
    document.body.appendChild(svg);
    setTimeout(() => svg.remove(), 460);
  }

  function spawnKeycapPop(wrap, label, progress = 0.5) {
    if (!wrap || !isFxEnabled() || !document.body) return;
    const rect = wrap.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return;

    const key = document.createElement("div");
    key.className = "cerolingo-fx-keycap";
    const displayChar = label === " " ? "␣" : String(label).slice(0, 2);
    key.textContent = displayChar;

    const x =
      rect.left +
      Math.min(rect.width - 18, Math.max(18, rect.width * (0.12 + progress * 0.72)));
    const y = rect.top + 2;
    const rot = Math.round((Math.random() - 0.5) * 14);
    key.style.left = `${Math.round(x)}px`;
    key.style.top = `${Math.round(y)}px`;
    key.style.setProperty("--key-rot", `${rot}deg`);

    document.body.appendChild(key);
    const cleanup = () => key.remove();
    key.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 420);
  }

  function spawnMicBypassFx(scope, fallbackEl) {
    if (!isFxEnabled() || !document.body) return;
    const micBtn =
      scope.querySelector?.('[data-test="challenge-speak-button"]') ||
      document.querySelector('[data-test="challenge-speak-button"]') ||
      fallbackEl;
    if (!micBtn) return;

    const rect = micBtn.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;

    const badge = document.createElement("div");
    badge.className = "cerolingo-fx-mic-badge";
    badge.style.left = `${Math.round(rect.left + rect.width * 0.5)}px`;
    badge.style.top = `${Math.round(rect.top + rect.height * 0.5)}px`;

    const svg = createSvgEl("svg", { viewBox: "0 0 28 28" });
    svg.appendChild(
      createSvgEl("rect", {
        x: 10,
        y: 3.5,
        width: 8,
        height: 13,
        rx: 4,
        fill: "#ffffff",
      }),
    );
    svg.appendChild(
      createSvgEl("path", {
        d: "M6 12.5a8 8 0 0 0 16 0 M14 20.5v4 M10 24.5h8",
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 2.6,
        "stroke-linecap": "round",
      }),
    );
    svg.appendChild(
      createSvgEl("path", {
        class: "cerolingo-fx-mic-slash",
        d: "M4 4L24 24",
        fill: "none",
        stroke: "#c95353",
        "stroke-width": 6,
        "stroke-linecap": "round",
      }),
    );
    svg.appendChild(
      createSvgEl("path", {
        class: "cerolingo-fx-mic-slash",
        d: "M4 4L24 24",
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 3.2,
        "stroke-linecap": "round",
      }),
    );

    badge.appendChild(svg);
    document.body.appendChild(badge);
    setTimeout(() => badge.remove(), 560);
  }

  function spawnAudioListenFx(scope) {
    if (!isFxEnabled() || !document.body) return;
    const anchor =
      scope.querySelector?.(
        '[data-test="challenge-listen-button"], [data-test="audio-button"], button[aria-label*="audio" i], button[aria-label*="listen" i]',
      ) || scope;
    if (!anchor) return;

    const now = Date.now();
    if (now - Number(anchor._cerolingoAudioFxAt || 0) < 900) return;
    anchor._cerolingoAudioFxAt = now;

    const rect = anchor.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;

    const pill = document.createElement("div");
    pill.className = "cerolingo-fx-audio-wave";
    const x = rect.left + rect.width * 0.5;
    const y =
      anchor === scope
        ? Math.max(54, rect.top + 36)
        : rect.top + rect.height * 0.5;
    pill.style.left = `${Math.round(x)}px`;
    pill.style.top = `${Math.round(y)}px`;

    for (let i = 0; i < 5; i++) {
      const bar = document.createElement("i");
      bar.className = "cerolingo-fx-eq-bar";
      pill.appendChild(bar);
    }

    document.body.appendChild(pill);
    setTimeout(() => pill.remove(), 540);
  }

  function spawnTargetGlow(el, mode = "click") {
    if (!el || !isFxEnabled() || !document.body) return;

    const rect = el.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return;

    const computed = window.getComputedStyle(el);
    const radius =
      computed.borderRadius && computed.borderRadius !== "0px"
        ? computed.borderRadius
        : "14px";

    const overlay = document.createElement("div");
    overlay.className = `cerolingo-fx-overlay cerolingo-fx-${mode}`;
    overlay.style.left = `${rect.left - 2}px`;
    overlay.style.top = `${rect.top - 2}px`;
    overlay.style.width = `${rect.width + 4}px`;
    overlay.style.height = `${rect.height + 4}px`;
    overlay.style.borderRadius = radius;

    document.body.appendChild(overlay);
    const cleanup = () => overlay.remove();
    overlay.addEventListener("animationend", cleanup, { once: true });
    setTimeout(cleanup, 390);
  }

  function applyTransientPress(el) {
    if (!el || !isFxEnabled()) return;
    el.classList.remove("cerolingo-btn-release");
    el.classList.add("cerolingo-btn-press");
    setTimeout(() => {
      if (!el.isConnected) return;
      el.classList.remove("cerolingo-btn-press");
      el.classList.add("cerolingo-btn-release");
      setTimeout(() => {
        if (el.isConnected) el.classList.remove("cerolingo-btn-release");
      }, 200);
    }, 105);
  }

  function startTypingHalo(el) {
    if (!el || !isFxEnabled() || !document.body) return null;
    const wrap = el.closest("label") || el;
    el.classList.remove("cerolingo-bot-typing-out");
    el.classList.add("cerolingo-bot-typing");
    if (wrap !== el) {
      wrap.classList.remove("cerolingo-bot-typing-out");
      wrap.classList.add("cerolingo-bot-typing");
    }

    const rect = wrap.getBoundingClientRect();
    let halo = null;
    if (rect.width >= 4 && rect.height >= 4) {
      const computed = window.getComputedStyle(wrap);
      const radius =
        computed.borderRadius && computed.borderRadius !== "0px"
          ? computed.borderRadius
          : "12px";

      halo = document.createElement("div");
      halo.className = "cerolingo-fx-typing-halo";
      halo.style.left = `${rect.left - 3}px`;
      halo.style.top = `${rect.top - 3}px`;
      halo.style.width = `${rect.width + 6}px`;
      halo.style.height = `${rect.height + 6}px`;
      halo.style.borderRadius = radius;
      document.body.appendChild(halo);
    }

    return { el, wrap, halo };
  }

  function endTypingHalo(handle) {
    if (!handle) return;
    const { el, wrap, halo } = handle;
    if (el?.isConnected) {
      el.classList.add("cerolingo-bot-typing-out");
      el.classList.remove("cerolingo-bot-typing");
      setTimeout(() => {
        if (el.isConnected) el.classList.remove("cerolingo-bot-typing-out");
      }, 240);
    }
    if (wrap && wrap !== el && wrap.isConnected) {
      wrap.classList.add("cerolingo-bot-typing-out");
      wrap.classList.remove("cerolingo-bot-typing");
      setTimeout(() => {
        if (wrap.isConnected) wrap.classList.remove("cerolingo-bot-typing-out");
      }, 240);
    }
    if (halo && halo.isConnected) {
      halo.classList.add("is-exiting");
      const cleanup = () => halo.remove();
      halo.addEventListener("animationend", cleanup, { once: true });
      setTimeout(cleanup, 260);
    }
  }

  function isVisibleElement(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      style.pointerEvents === "none"
    ) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function isVisibleEditable(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      style.pointerEvents === "none"
    ) {
      return false;
    }
    // Empty inline contenteditable blanks (e.g. partialReverseTranslate) have width: 0, height > 0
    const rect = el.getBoundingClientRect();
    if (rect.height > 0 || rect.width > 0) return true;
    const parentRect = el.parentElement?.getBoundingClientRect();
    return Boolean(parentRect && parentRect.width > 0 && parentRect.height > 0);
  }

  function isButtonEnabled(el) {
    return Boolean(
      el &&
        !el.disabled &&
        el.getAttribute?.("aria-disabled") !== "true" &&
        isVisibleElement(el),
    );
  }

  function isAlreadySelected(el) {
    if (!el) return false;
    if (
      el.getAttribute("aria-checked") === "true" ||
      el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-selected") === "true"
    ) {
      return true;
    }
    const input = el.querySelector?.(
      'input[type="checkbox"]:checked, input[type="radio"]:checked',
    );
    return Boolean(input);
  }

  async function ensureInViewport(el) {
    if (!el || !el.isConnected) return;
    const rect = el.getBoundingClientRect();
    if (rect.bottom < 8 || rect.top > window.innerHeight - 8) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await sleep(55);
      } catch {}
    }
  }

  async function botClick(el, opts = {}) {
    if (!el || !el.isConnected || el.disabled || el.getAttribute?.("aria-disabled") === "true") {
      return false;
    }
    const now = Date.now();
    const minDebounce = opts.minDebounce ?? 110;
    if (now - Number(el._cerolingoLastBotClickAt || 0) < minDebounce) {
      return false;
    }
    el._cerolingoLastBotClickAt = now;

    if (!isFxEnabled()) {
      el.click();
      return true;
    }

    await ensureInViewport(el);
    if (!el.isConnected || el.disabled || el.getAttribute?.("aria-disabled") === "true") {
      return false;
    }

    const mode = opts.mode || "click";
    markSolvingActive();

    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const jx = (Math.random() - 0.5) * Math.min(8, rect.width * 0.22);
      const jy = (Math.random() - 0.5) * Math.min(6, rect.height * 0.22);
      const targetX = rect.left + rect.width * 0.5 + jx;
      const targetY = rect.top + rect.height * 0.5 + jy;

      const glideMs = moveVirtualCursorTo(targetX, targetY, mode);
      if (glideMs > 0) {
        await sleep(Math.max(36, glideMs - 14));
      }

      pulseCursorPress();
      spawnTargetGlow(el, mode);
      spawnClickBurst(targetX, targetY, mode);
      applyTransientPress(el);
      await sleep(24);
    }

    if (el.isConnected && !el.disabled && el.getAttribute?.("aria-disabled") !== "true") {
      el.click();
    }
    await sleep(16);
    return true;
  }

  // Text normalization helpers
  function getTokenText(btn) {
    if (!btn) return "";
    const label = btn.querySelector('[data-test="challenge-tap-token-text"]');
    if (label) {
      return (label.textContent || label.innerText || "").trim();
    }
    const raw = (btn.innerText || btn.textContent || "").trim();
    // Strip leading hotkey prefix like "1\nword" without stripping numeric tokens
    const withoutHotkeyLine = raw.replace(/^\s*\d+\s*\n+/, "").trim();
    if (withoutHotkeyLine) return withoutHotkeyLine;
    return raw;
  }

  function normToken(text) {
    return String(text ?? "")
      .normalize("NFC")
      .replace(/\u00a0/g, " ")
      .replace(/[’‘‚`´]/g, "'")
      .replace(/[“”„«»]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .toLocaleLowerCase();
  }

  function cleanToken(text) {
    return normToken(text)
      .replace(/…/g, "...")
      .replace(/\s+([?.!,;:])/g, "$1")
      .replace(/^[?.!,;:"'¡¿…\s-]+|[?.!,;:"'¡¿…\s-]+$/g, "")
      .trim();
  }

  function getButtonTokenCandidates(btn) {
    const out = new Set();
    const add = (val) => {
      const n = normToken(val);
      if (n) out.add(n);
    };
    add(getTokenText(btn));

    const dt = btn.getAttribute?.("data-test") || "";
    // Multi-word tokens can be encoded as "house-challenge-tap-token my"
    const dtMatch = dt.match(/^(.*?)-challenge-tap-token(?:\s+(.*))?$/);
    if (dtMatch) {
      add(dtMatch[1]);
      if (dtMatch[2]) add(`${dtMatch[2]} ${dtMatch[1]}`);
    }

    return Array.from(out);
  }

  function buttonMatchesToken(btn, expected) {
    const wantNorm = normToken(expected);
    if (!wantNorm) return false;
    const wantClean = cleanToken(expected);
    const cands = getButtonTokenCandidates(btn);

    if (cands.some((c) => c === wantNorm)) return true;
    if (wantClean && cands.some((c) => cleanToken(c) === wantClean)) return true;
    return false;
  }

  function setReactInputValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;

    if (setter) {
      setter.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function typewriteReactInput(el, value) {
    if (!el || value == null) return;
    const str = String(value);
    if (!str) return;
    if (normToken(el.value) === normToken(str)) return;

    if (!isFxEnabled()) {
      el.focus();
      setReactInputValue(el, str);
      return;
    }

    await ensureInViewport(el);
    markSolvingActive();

    const wrap = el.closest("label") || el;
    const rect = wrap.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const tx = rect.left + Math.min(rect.width * 0.28, 72);
      const ty = rect.top + rect.height * 0.5;
      const glideMs = moveVirtualCursorTo(tx, ty, "typing");
      if (glideMs > 0) await sleep(Math.max(30, glideMs - 12));
      pulseCursorPress();
      spawnClickBurst(tx, ty, "typing");
      // Keep cursor at the right edge while typing
      const parkX = Math.min(window.innerWidth - 70, rect.right - 22);
      const parkY = Math.max(28, rect.top + rect.height * 0.45);
      moveVirtualCursorTo(parkX, parkY, "typing");
    }

    const haloHandle = startTypingHalo(el);
    el.focus();

    const totalSteps = Math.min(str.length, 12);
    const stepSize = Math.max(1, Math.ceil(str.length / totalSteps));
    const keycapInterval = Math.max(1, Math.ceil(totalSteps / 4));
    let stepIdx = 0;

    for (let i = stepSize; i < str.length; i += stepSize) {
      if (!el.isConnected) break;
      markSolvingActive();
      setReactInputValue(el, str.slice(0, i));
      if (stepIdx % keycapInterval === 0) {
        spawnKeycapPop(wrap, str[i - 1], i / str.length);
      }
      stepIdx++;
      await sleep(jitter(16, 6));
    }

    if (el.isConnected) {
      setReactInputValue(el, str);
      spawnKeycapPop(wrap, str[str.length - 1], 0.95);
    }
    await sleep(34);
    endTypingHalo(haloHandle);
  }

  async function typewriteContentEditable(el, value) {
    if (!el || !value) return;
    const str = String(value);
    if (normToken(el.textContent) === normToken(str)) return;

    const applyEditable = (text) => {
      el.textContent = text;
      try {
        el.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            inputType: "insertText",
            data: text,
          }),
        );
      } catch {
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };

    if (!isFxEnabled()) {
      el.focus();
      applyEditable(str);
      return;
    }

    await ensureInViewport(el);
    markSolvingActive();

    const wrap = el.closest("label") || el;
    const rect = wrap.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const tx = rect.left + rect.width * 0.5;
      const ty = rect.top + rect.height * 0.5;
      const glideMs = moveVirtualCursorTo(tx, ty, "typing");
      if (glideMs > 0) await sleep(Math.max(30, glideMs - 12));
      pulseCursorPress();
      spawnClickBurst(tx, ty, "typing");
    }

    const haloHandle = startTypingHalo(el);
    el.focus();

    const totalSteps = Math.min(str.length, 11);
    const stepSize = Math.max(1, Math.ceil(str.length / totalSteps));
    const keycapInterval = Math.max(1, Math.ceil(totalSteps / 3));
    let stepIdx = 0;

    for (let i = stepSize; i < str.length; i += stepSize) {
      if (!el.isConnected) break;
      markSolvingActive();
      applyEditable(str.slice(0, i));
      if (stepIdx % keycapInterval === 0) {
        spawnKeycapPop(wrap, str[i - 1], i / str.length);
      }
      stepIdx++;
      await sleep(jitter(16, 6));
    }

    if (el.isConnected) {
      applyEditable(str);
      spawnKeycapPop(wrap, str[str.length - 1], 0.92);
    }
    await sleep(34);
    endTypingHalo(haloHandle);
  }

  // Challenge detection & React fiber lookup
  function getActiveChallengeEl() {
    // Match challenge containers, not inner controls
    const all = Array.from(
      document.querySelectorAll(
        '[data-test^="challenge "], [data-test="challenge"]',
      ),
    );
    if (all.length === 0) return null;
    if (all.length === 1) return all[0];

    for (const el of all) {
      const wrapper = el.parentElement || el;
      const style = window.getComputedStyle(wrapper);
      if (
        style.opacity === "0" ||
        style.visibility === "hidden" ||
        style.pointerEvents === "none"
      ) {
        continue;
      }

      const activeControls = el.querySelector(
        'button:not(:disabled):not([aria-disabled="true"]), input:not(:disabled), textarea:not(:disabled), [contenteditable="true"], [data-test="challenge-choice"], [data-test="challenge-choice-card"], [role="radio"], [role="checkbox"]',
      );
      if (activeControls) return el;
    }

    return all.find(isVisibleElement) || all[0];
  }

  function hasBlameBannerVisible() {
    const blame = document.querySelector(
      '[data-test^="blame "], [data-test="blame-correct"], [data-test="blame-incorrect"]',
    );
    return Boolean(blame && isVisibleElement(blame));
  }

  function getChallengeType(obj) {
    if (!obj || typeof obj !== "object") return null;
    return obj.type === "challenge" ? obj.challengeType : obj.type;
  }

  function hasChallengePayload(obj, expectedType) {
    if (!obj || typeof obj !== "object") return false;
    const objType = getChallengeType(obj);
    if (expectedType && objType && objType !== expectedType) return false;

    if (
      (!expectedType ||
        expectedType === "match" ||
        expectedType === "listenMatch" ||
        expectedType === "characterMatch" ||
        expectedType === "radioListenMatch" ||
        expectedType === "extendedMatch" ||
        expectedType === "extendedListenMatch") &&
      Array.isArray(obj.pairs) &&
      obj.pairs.length > 0
    ) {
      return true;
    }
    if (
      (Array.isArray(obj.correctTokens) && obj.correctTokens.length > 0) ||
      (Array.isArray(obj.correctSolutions) &&
        obj.correctSolutions.length > 0) ||
      (typeof obj.bestSolution === "string" && obj.bestSolution.length > 0) ||
      (typeof obj.answer === "string" && obj.answer.length > 0) ||
      (typeof obj.correctAnswer === "string" && obj.correctAnswer.length > 0) ||
      (typeof obj.solutionTranslation === "string" &&
        obj.solutionTranslation.length > 0 &&
        (Array.isArray(obj.choices) ||
          Array.isArray(obj.displayTokens) ||
          Array.isArray(obj.rows) ||
          typeof obj.correctIndex === "number" ||
          typeof obj.prompt === "string")) ||
      (Array.isArray(obj.displayTokens) && obj.displayTokens.length > 0) ||
      (Array.isArray(obj.rows) && obj.rows.length > 0) ||
      (Array.isArray(obj.choices) &&
        obj.choices.some((c) => c?.correct === true || c?.isCorrect === true)) ||
      typeof obj.correctIndex === "number" ||
      (Array.isArray(obj.correctIndices) && obj.correctIndices.length > 0) ||
      typeof obj.isTrue === "boolean" ||
      objType === "speak" ||
      objType === "listenSpeak" ||
      objType === "characterTrace" ||
      objType === "freeResponse" ||
      ((objType === "listen" ||
        objType === "listenComplete" ||
        objType === "listenIsolation") &&
        typeof obj.prompt === "string" &&
        obj.prompt.length > 0)
    ) {
      return true;
    }

    return false;
  }

  function extractFromCandidateObj(obj, expectedType) {
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj.challenges) && typeof obj.challengeIndex === "number") {
      const ch = obj.challenges[obj.challengeIndex];
      if (hasChallengePayload(ch, expectedType)) return ch;
    }
    if (
      obj.session &&
      Array.isArray(obj.session.challenges) &&
      typeof obj.challengeIndex === "number"
    ) {
      const ch = obj.session.challenges[obj.challengeIndex];
      if (hasChallengePayload(ch, expectedType)) return ch;
    }
    if (hasChallengePayload(obj.challenge, expectedType)) return obj.challenge;
    if (hasChallengePayload(obj.currentChallenge, expectedType)) {
      return obj.currentChallenge;
    }
    if (hasChallengePayload(obj.element, expectedType)) return obj.element;
    if (hasChallengePayload(obj, expectedType)) return obj;
    return null;
  }

  function extractFromFiberNode(node, expectedType) {
    if (!node) return null;

    const fromProps = extractFromCandidateObj(node.memoizedProps, expectedType);
    if (fromProps) return fromProps;

    let s = node.memoizedState;
    let hookSteps = 0;
    while (s && hookSteps < 40) {
      hookSteps++;
      const fromState = extractFromCandidateObj(s.memoizedState, expectedType);
      if (fromState) return fromState;
      const fromQueue = extractFromCandidateObj(
        s.queue?.lastRenderedState,
        expectedType,
      );
      if (fromQueue) return fromQueue;
      s = s.next;
    }

    return null;
  }

  function findChallengeInTrees(activeEl, expectedType) {
    const startEl =
      activeEl ||
      document.querySelector(
        '[data-test="challenge-choice"], [data-test="challenge-choice-card"], [data-test*="-challenge-tap-token"], [data-test="challenge-text-input"], [data-test="challenge-translate-input"]',
      );

    if (startEl) {
      const fiberKey = Object.keys(startEl).find(
        (k) =>
          k.startsWith("__reactFiber$") ||
          k.startsWith("__reactInternalInstance$"),
      );
      if (fiberKey) {
        const startFiber = startEl[fiberKey];

        let curr = startFiber;
        while (curr) {
          const found = extractFromFiberNode(curr, expectedType);
          if (found) return found;
          curr = curr.return;
        }

        const visited = new Set();
        const subQueue = [startFiber];
        while (subQueue.length > 0 && visited.size < 2500) {
          const node = subQueue.shift();
          if (!node || visited.has(node)) continue;
          visited.add(node);

          const found = extractFromFiberNode(node, expectedType);
          if (found) return found;

          if (node.child) subQueue.push(node.child);
          if (node !== startFiber && node.sibling) subQueue.push(node.sibling);
        }
      }
    }

    const root = document.querySelector("#root");
    if (!root) return null;

    const rootFiberKey = Object.keys(root).find(
      (k) => k.startsWith("__reactContainer$") || k.startsWith("__reactFiber$"),
    );
    if (!rootFiberKey) return null;

    const visited = new Set();
    const queue = [root[rootFiberKey]];

    while (queue.length > 0 && visited.size < 12000) {
      const node = queue.shift();
      if (!node || visited.has(node)) continue;
      visited.add(node);

      const found = extractFromFiberNode(node, expectedType);
      if (found) return found;

      if (node.child) queue.push(node.child);
      if (node.sibling) queue.push(node.sibling);
    }

    return null;
  }

  function getChallenge(activeEl) {
    const dt = activeEl?.getAttribute("data-test") || "";
    const expectedType = dt.match(/challenge-([a-zA-Z]+)/)?.[1] || null;

    const matched = findChallengeInTrees(activeEl, expectedType);
    if (matched) return matched;

    if (expectedType) {
      return findChallengeInTrees(activeEl, null);
    }

    return null;
  }

  function extractBlankTokens(ch) {
    const blanks = [];
    const scanToken = (t) => {
      if (!t || typeof t !== "object") return;
      if (t.isBlank && typeof t.text === "string") {
        const trimmed = t.text.trim();
        if (trimmed) blanks.push(trimmed);
        return;
      }
      if (typeof t.damageStart === "number" && typeof t.text === "string") {
        const end =
          typeof t.damageEnd === "number" ? t.damageEnd : t.text.length;
        const slice = t.text.slice(t.damageStart, end).trim();
        if (slice) blanks.push(slice);
      }
    };

    const scanList = (arr) => {
      if (!Array.isArray(arr)) return;
      for (const item of arr) {
        if (Array.isArray(item)) {
          scanList(item);
        } else if (item && typeof item === "object") {
          if (Array.isArray(item.displayTokens)) {
            scanList(item.displayTokens);
          } else if (Array.isArray(item.cells)) {
            scanList(item.cells);
          } else if (Array.isArray(item.tokens)) {
            scanList(item.tokens);
          } else {
            scanToken(item);
          }
        }
      }
    };

    if (ch) {
      scanList(ch.displayTokens);
      scanList(ch.rows);
    }
    return blanks;
  }

  // Group consecutive blank tokens per input
  function extractBlankInputGroups(ch) {
    const groups = [];
    const scanTokenList = (arr) => {
      if (!Array.isArray(arr)) return;
      let currentBlank = "";
      const flush = () => {
        const cleaned = currentBlank.replace(/\s+/g, " ").trim();
        if (cleaned) groups.push(cleaned);
        currentBlank = "";
      };

      for (const item of arr) {
        if (Array.isArray(item)) {
          flush();
          scanTokenList(item);
        } else if (item && typeof item === "object") {
          if (Array.isArray(item.displayTokens)) {
            flush();
            scanTokenList(item.displayTokens);
          } else if (Array.isArray(item.cells)) {
            flush();
            scanTokenList(item.cells);
          } else if (Array.isArray(item.tokens)) {
            flush();
            scanTokenList(item.tokens);
          } else if (item.isBlank && typeof item.text === "string") {
            currentBlank += item.text;
          } else if (
            typeof item.damageStart === "number" &&
            typeof item.text === "string"
          ) {
            flush();
            const end =
              typeof item.damageEnd === "number"
                ? item.damageEnd
                : item.text.length;
            const slice = item.text.slice(item.damageStart, end).trim();
            if (slice) groups.push(slice);
          } else {
            flush();
          }
        } else {
          flush();
        }
      }
      flush();
    };

    if (ch) {
      scanTokenList(ch.displayTokens);
      scanTokenList(ch.rows);
    }
    return groups;
  }

  // Next / Continue helpers
  const SAFE_NEXT_DATA_TESTS = [
    '[data-test="player-next"]',
    '[data-test="secondary-continue-button"]',
    '[data-test="quests-continue-button"]',
    '[data-test="plus-no-thanks"]',
    '[data-test="notification-drawer-no-thanks-button"]',
    '[data-test="practice-reminder-no-thanks"]',
    '[data-test="streak-freeze-no-thanks"]',
  ];

  const SAFE_NEXT_TEXTS = new Set([
    "continue",
    "kontynuuj",
    "dalej",
    "weiter",
    "continuar",
    "continuer",
    "avanti",
    "let's go",
    "claim",
    "claim xp",
    "got it",
    "no thanks",
    "nie, dziękuję",
    "maybe later",
    "może później",
    "not now",
    "nie teraz",
    "i'll do it later",
  ]);

  function findNextButton(hasActiveChallenge = false) {
    for (const sel of SAFE_NEXT_DATA_TESTS) {
      const btn = document.querySelector(sel);
      if (isButtonEnabled(btn)) return btn;
    }

    const candidateButtons = Array.from(document.querySelectorAll("button"));
    return (
      candidateButtons.find((btn) => {
        if (!isButtonEnabled(btn)) return false;
        if (
          btn.closest("#cerolingoModMenu") ||
          btn.closest('[data-test^="challenge"]') ||
          btn.closest('[data-test="word-bank"]')
        ) {
          return false;
        }
        const inOverlay = Boolean(btn.closest("#overlays"));
        if (hasActiveChallenge && !inOverlay) {
          return false;
        }
        const dt = btn.getAttribute("data-test") || "";
        if (
          dt.includes("challenge") ||
          dt.includes("story") ||
          dt.includes("stories") ||
          dt === "player-skip" ||
          dt === "quit-button" ||
          dt === "plus-offer-button" ||
          dt === "purchase-button"
        ) {
          return false;
        }
        const text = normToken(btn.innerText || btn.textContent || "");
        return SAFE_NEXT_TEXTS.has(text);
      }) || null
    );
  }

  async function clickNext(hasActiveChallenge = false, opts = {}) {
    const btn = findNextButton(hasActiveChallenge);
    if (btn) {
      return await botClick(btn, { mode: "confirm", ...opts });
    }
    return false;
  }

  async function clickCheckAndContinue() {
    await sleep(isFxEnabled() ? 42 : 18);

    const checkBtn = document.querySelector('[data-test="player-next"]');
    if (!isButtonEnabled(checkBtn)) {
      await clickNext(false, { minDebounce: 70, mode: "confirm" });
      return;
    }

    const beforeLabel = normToken(checkBtn.innerText || checkBtn.textContent || "");
    const hadBlameBefore = hasBlameBannerVisible();
    const clickedCheck = await botClick(checkBtn, {
      minDebounce: 70,
      mode: "confirm",
    });
    if (!clickedCheck || hadBlameBefore) return;

    const deadline = Date.now() + 480;
    while (Date.now() < deadline) {
      await sleep(30);
      const nextBtn = document.querySelector('[data-test="player-next"]');
      if (!isButtonEnabled(nextBtn)) continue;

      const labelNow = normToken(nextBtn.innerText || nextBtn.textContent || "");
      const flipped =
        nextBtn !== checkBtn ||
        hasBlameBannerVisible() ||
        (beforeLabel && labelNow && labelNow !== beforeLabel);

      if (flipped) {
    
        await sleep(isFxEnabled() ? 65 : 15);
        await botClick(nextBtn, { minDebounce: 55, mode: "confirm" });
        return;
      }
    }
  }

  // Choices & word bank helpers
  function getChoiceElements(scope) {
    const raw = Array.from(
      scope.querySelectorAll(
        '[data-test="challenge-choice"], [data-test="challenge-choice-card"]',
      ),
    ).filter(isVisibleElement);

    // Keep outermost clickable element
    const deduped = raw.filter(
      (el) => !raw.some((other) => other !== el && other.contains(el)),
    );
    if (deduped.length > 0) return deduped;

    return Array.from(
      scope.querySelectorAll('[role="radio"], [role="checkbox"]'),
    ).filter(isVisibleElement);
  }

  function getEnabledBankButtons(scope) {
    const bank = scope.querySelector('[data-test="word-bank"]');
    const container = bank || scope;
    const selector = bank
      ? 'button:not([disabled]):not([aria-disabled="true"])'
      : 'button[data-test*="-challenge-tap-token"]:not([disabled]):not([aria-disabled="true"])';
    return {
      bank,
      buttons: Array.from(container.querySelectorAll(selector)).filter(
        isVisibleElement,
      ),
    };
  }

  async function tapWordSequence(scope, rawTokens, delayBase = 36, mode = "click") {
    const tokens = rawTokens
      .map((t) => (typeof t === "string" ? t : t?.text))
      .filter(Boolean);
    if (tokens.length === 0) return false;

    const usedButtons = new Set();
    let clickedAny = false;

    for (const token of tokens) {
      const { buttons } = getEnabledBankButtons(scope);
      const pool = buttons.filter((b) => !usedButtons.has(b));
      const wantNorm = normToken(token);
      const wantClean = cleanToken(token);

      const match =
        pool.find((b) => normToken(getTokenText(b)) === wantNorm) ||
        pool.find((b) => buttonMatchesToken(b, token)) ||
        (wantClean
          ? pool.find((b) => cleanToken(getTokenText(b)) === wantClean)
          : null);

      if (match) {
        usedButtons.add(match);
        await botClick(match, { minDebounce: 80, mode });
        clickedAny = true;
        if (isFxEnabled()) {
          await sleep(jitter(delayBase, 14));
        } else {
          await sleep(14);
        }
      }
    }

    return clickedAny;
  }

  async function tapSolutionGreedyFromBank(scope, solutionText, mode = "click") {
    if (!solutionText) return false;
    const { bank, buttons } = getEnabledBankButtons(scope);
    if (!bank || buttons.length === 0) return false;

    let remaining = cleanToken(solutionText);
    if (!remaining) return false;

    const usedButtons = new Set();
    const chosenOrder = [];

    // Greedy longest-prefix match against available word-bank tokens
    for (let guard = 0; guard < 30 && remaining.length > 0; guard++) {
      const candidates = buttons
        .filter((b) => !usedButtons.has(b))
        .map((b) => ({ btn: b, text: cleanToken(getTokenText(b)) }))
        .filter((x) => x.text.length > 0)
        .sort((a, b) => b.text.length - a.text.length);

      const match = candidates.find(
        (c) =>
          remaining === c.text ||
          remaining.startsWith(`${c.text} `) ||
          remaining.startsWith(`${c.text}'`) ||
          ((c.text.endsWith("'") ||
            c.text.endsWith("-") ||
            /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(c.text)) &&
            remaining.startsWith(c.text)),
      );
      if (!match) break;

      usedButtons.add(match.btn);
      chosenOrder.push(match.btn);
      remaining = remaining
        .slice(match.text.length)
        .replace(/^['’\-.,!?;:]+/, "")
        .trim();
    }

    if (chosenOrder.length === 0) return false;

    for (const btn of chosenOrder) {
      await botClick(btn, { minDebounce: 80, mode });
      await sleep(isFxEnabled() ? jitter(36, 14) : 14);
    }
    return true;
  }

  // Challenge solvers
  async function solveSpeak(ch, scope) {
    const chType = getChallengeType(ch);
    const speakSkipRegex =
      /can.?t speak|nie mog[eę].*m[oó]wi|kann.*sprechen|no puedo hablar|ne peux pas parler/i;
    let skipBtn = document.querySelector('[data-test="player-skip"]');
    if (!isButtonEnabled(skipBtn)) {
      skipBtn =
        Array.from(document.querySelectorAll("button")).find(
          (b) =>
            isButtonEnabled(b) &&
            !b.closest("#cerolingoModMenu") &&
            speakSkipRegex.test(b.innerText || b.textContent || ""),
        ) || null;
    }
    if (!isButtonEnabled(skipBtn)) return false;

    const isSpeakChallenge =
      chType === "speak" ||
      chType === "listenSpeak" ||
      Boolean(
        scope.querySelector?.(
          '[data-test*="challenge-speak"], [data-test*="challenge-listenSpeak"], [data-test="challenge-speak-button"]',
        ),
      ) ||
      Boolean(
        document.querySelector(
          '[data-test*="challenge-speak"], [data-test*="challenge-listenSpeak"], [data-test="challenge-speak-button"]',
        ),
      ) ||
      speakSkipRegex.test(skipBtn.innerText || skipBtn.textContent || "");

    if (!isSpeakChallenge) return false;

    if (isFxEnabled()) {
      spawnMicBypassFx(scope, skipBtn);
      await sleep(90);
    }
    await botClick(skipBtn, { mode: "mic" });
    return true;
  }

  async function solveCharacterTrace(ch) {
    const chType = getChallengeType(ch);
    if (chType !== "characterTrace") return false;
    const skipBtn = document.querySelector('[data-test="player-skip"]');
    if (isButtonEnabled(skipBtn)) {
      await botClick(skipBtn);
      return true;
    }
    return false;
  }

  async function solveName(ch, scope) {
    if (!ch) return false;
    const chType = getChallengeType(ch);
    const input = scope.querySelector('input[data-test="challenge-text-input"]');
    const choices = getChoiceElements(scope);

    const hasBoth = Boolean(input && isVisibleElement(input) && choices.length > 0);
    if (chType !== "name" && !hasBoth) return false;

    const solution =
      ch.bestSolution ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
      ch.solutionTranslation;
    if (!solution) return false;

    let nounPart = String(solution).trim();

    if (choices.length > 0) {
      const normSol = normToken(nounPart);
      const articleChoice = choices.find((c) => {
        const text = normToken(
          c.querySelector('[data-test="challenge-judge-text"]')?.innerText ||
            c.innerText ||
            c.textContent,
        );
        if (!text) return false;
        return (
          normSol.startsWith(`${text} `) ||
          normSol.startsWith(`${text}'`) ||
          normSol === text
        );
      });

      if (articleChoice) {
        if (!isAlreadySelected(articleChoice)) {
          await botClick(articleChoice);
          await sleep(isFxEnabled() ? 35 : 12);
        }
        const artText = (
          articleChoice.querySelector('[data-test="challenge-judge-text"]')
            ?.innerText ||
          articleChoice.innerText ||
          ""
        ).trim();
        if (artText && nounPart.toLowerCase().startsWith(artText.toLowerCase())) {
          const rest = nounPart.slice(artText.length).trim();
          if (rest) nounPart = rest;
        }
      }
    }

    if (input && isVisibleElement(input)) {
      await typewriteReactInput(input, nounPart);
      return true;
    }

    return false;
  }

  async function solveRadioBinary(ch, scope) {
    if (!ch || typeof ch.isTrue !== "boolean") return false;
    const choices = getChoiceElements(scope);
    if (choices.length < 2) return false;

    spawnAudioListenFx(scope);

    const wantTrue = ch.isTrue;
    const byText = choices.find((c) => {
      const t = normToken(c.innerText || c.textContent || "");
      if (wantTrue) {
        return /^(true|yes|right|correct|prawda|tak|sí|si|ja|vrai)$/i.test(t);
      }
      return /^(false|no|wrong|incorrect|fałsz|nie|nein|faux)$/i.test(t);
    });
    const target = byText || choices[wantTrue ? 0 : 1];
    if (target) {
      if (!isAlreadySelected(target)) {
        await botClick(target, { mode: "listen" });
      }
      return true;
    }
    return false;
  }

  async function solveAssist(ch, scope) {
    if (!ch) return false;

    const choices = getChoiceElements(scope);
    if (choices.length === 0) return false;

    const chType = getChallengeType(ch);
    const isAudioAssist =
      chType === "listenComprehension" ||
      chType === "listenIsolation" ||
      chType === "selectPronunciation";
    const clickMode = isAudioAssist ? "listen" : "click";
    if (isAudioAssist) {
      spawnAudioListenFx(scope);
    }

    if (typeof ch.correctIndex === "number" && choices[ch.correctIndex]) {
      const target = choices[ch.correctIndex];
      if (!isAlreadySelected(target)) {
        await botClick(target, { mode: clickMode });
      }
      return true;
    }

    if (Array.isArray(ch.choices)) {
      const markedIdx = ch.choices.findIndex(
        (c) => c?.correct === true || c?.isCorrect === true,
      );
      if (markedIdx >= 0 && choices[markedIdx]) {
        const target = choices[markedIdx];
        if (!isAlreadySelected(target)) {
          await botClick(target, { mode: clickMode });
        }
        return true;
      }
    }

    if (Array.isArray(ch.correctIndices) && ch.correctIndices.length > 0) {
      let acted = false;
      for (const idx of ch.correctIndices) {
        const target = choices[idx];
        if (target) {
          if (!isAlreadySelected(target)) {
            await botClick(target);
            await sleep(isFxEnabled() ? jitter(40, 12) : 14);
          }
          acted = true;
        }
      }
      if (acted) return true;
    }

    const candidateAnswers = [];
    if (typeof ch.bestSolution === "string") candidateAnswers.push(ch.bestSolution);
    if (Array.isArray(ch.correctSolutions)) {
      candidateAnswers.push(...ch.correctSolutions);
    }
    if (typeof ch.solutionTranslation === "string") {
      candidateAnswers.push(ch.solutionTranslation);
    }
    if (Array.isArray(ch.choices) && typeof ch.correctIndex === "number") {
      const raw = ch.choices[ch.correctIndex];
      const txt = typeof raw === "string" ? raw : raw?.text || raw?.phrase;
      if (txt) candidateAnswers.push(txt);
    }

    for (const ans of candidateAnswers) {
      const targetNorm = normToken(ans);
      const targetClean = cleanToken(ans);
      if (!targetNorm) continue;

      const match = choices.find((choice) => {
        const textEl =
          choice.querySelector('[data-test="challenge-judge-text"]') || choice;
        const txt = textEl.innerText || textEl.textContent || "";
        return (
          normToken(txt) === targetNorm ||
          (targetClean && cleanToken(txt) === targetClean)
        );
      });
      if (match) {
        if (!isAlreadySelected(match)) {
          await botClick(match);
        }
        return true;
      }
    }

    return false;
  }

  function getInlineSizerAnswer(input) {
    const parent = input?.parentElement;
    if (!parent) return null;

    const siblingDiv = parent.querySelector("div");
    if (!siblingDiv) return null;

    // Ignore virtual keyboard / accent bars
    if (
      siblingDiv.querySelector("button") ||
      siblingDiv.hasAttribute("lang") ||
      /[↑↓]/.test(siblingDiv.textContent || "")
    ) {
      return null;
    }

    const raw = (siblingDiv.textContent || "").trim();
    if (!raw) return null;

    const isUnderscoreSizer = /^_.+_$/s.test(raw);
    const isInsideLabel = Boolean(parent.closest("label"));
    if (!isUnderscoreSizer && !isInsideLabel) return null;

    const cleaned = raw.replace(/^_+/, "").replace(/_+$/, "").trim();
    return cleaned || null;
  }

  async function solveCompleteReverseTranslation(ch, scope) {
    const blankGroups = extractBlankInputGroups(ch);

    const editables = Array.from(
      scope.querySelectorAll('[contenteditable="true"]'),
    ).filter(isVisibleEditable);
    if (editables.length > 0 && blankGroups.length > 0) {
      let filledEditable = false;
      for (let idx = 0; idx < editables.length; idx++) {
        const text =
          editables.length === 1 ? blankGroups.join(" ") : blankGroups[idx];
        if (!text) continue;
        await typewriteContentEditable(editables[idx], text);
        filledEditable = true;
      }
      if (filledEditable) return true;
    }

    const inputs = Array.from(
      scope.querySelectorAll('input[data-test="challenge-text-input"]'),
    ).filter(isVisibleElement);
    if (inputs.length === 0) return false;

    let filled = false;

    if (blankGroups.length > 0) {
      for (let idx = 0; idx < inputs.length; idx++) {
        const text =
          inputs.length === 1 && blankGroups.length > 1
            ? blankGroups.join(" ")
            : blankGroups[idx];
        if (text) {
          await typewriteReactInput(inputs[idx], text);
          filled = true;
        }
      }
    }

    if (!filled && ch) {
      const chType = getChallengeType(ch);
      const solution =
        ch.bestSolution ||
        (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
        ch.solutionTranslation ||
        (Array.isArray(ch.correctTokens) && ch.correctTokens.join(" ")) ||
        (chType === "listenComplete" && ch.prompt) ||
        ch.answer ||
        ch.correctAnswer;

      if (solution) {
        await typewriteReactInput(inputs[0], solution);
        filled = true;
      }
    }

    if (!filled) {
      for (const input of inputs) {
        const answer = getInlineSizerAnswer(input);
        if (answer) {
          await typewriteReactInput(input, answer);
          filled = true;
        }
      }
    }

    return filled;
  }

  async function solveListen(ch, scope) {
    const chType = getChallengeType(ch);
    if (
      !ch ||
      (chType !== "listen" &&
        chType !== "listenTap" &&
        chType !== "listenComplete" &&
        chType !== "listenIsolation")
    ) {
      return false;
    }

    spawnAudioListenFx(scope);

    const textarea = scope.querySelector(
      'textarea[data-test="challenge-translate-input"], input[data-test="challenge-text-input"]',
    );
    if (textarea && isVisibleElement(textarea)) {
      const blankGroups = extractBlankInputGroups(ch);
      const solution =
        (blankGroups.length > 0 ? blankGroups.join(" ").trim() : null) ||
        ch.prompt ||
        ch.bestSolution ||
        (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
        (Array.isArray(ch.correctTokens) && ch.correctTokens.join(" "));

      if (solution) {
        await typewriteReactInput(textarea, solution);
        return true;
      }
    }

    if (Array.isArray(ch.correctTokens) && ch.correctTokens.length > 0) {
      if (await tapWordSequence(scope, ch.correctTokens, 36, "listen")) {
        return true;
      }
    }

    const fallbackSol =
      ch.prompt ||
      ch.bestSolution ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]);
    if (fallbackSol && scope.querySelector('[data-test="word-bank"]')) {
      return await tapSolutionGreedyFromBank(scope, fallbackSol, "listen");
    }

    return false;
  }

  const TAP_COMPLETE_TYPES = new Set([
    "patternTapComplete",
    "tapCloze",
    "tapClozeTable",
    "tapComplete",
    "tapCompleteTable",
    "orderTapComplete",
    "syllableTap",
    "syllableListenTap",
    "tapDescribe",
    "readTap",
  ]);

  async function solvePatternTapComplete(ch, scope) {
    if (!ch) return false;
    const chType = getChallengeType(ch);
    const blankTokens = extractBlankTokens(ch);

    if (!TAP_COMPLETE_TYPES.has(chType) && blankTokens.length === 0) {
      return false;
    }

    const { buttons: btns } = getEnabledBankButtons(scope);
    if (btns.length === 0) return false;

    if (typeof ch.correctIndex === "number" && btns[ch.correctIndex]) {
      await botClick(btns[ch.correctIndex]);
      return true;
    }

    if (Array.isArray(ch.correctIndices) && ch.correctIndices.length > 0) {
      // If ch.choices exists, match by text first in case buttons are shuffled
      if (Array.isArray(ch.choices)) {
        const indexedTokens = ch.correctIndices
          .map((idx) => ch.choices[idx])
          .filter(Boolean);
        if (indexedTokens.length > 0) {
          if (await tapWordSequence(scope, indexedTokens, 38)) {
            return true;
          }
        }
      }
      for (const idx of ch.correctIndices) {
        if (btns[idx]) {
          await botClick(btns[idx]);
          await sleep(isFxEnabled() ? jitter(40, 14) : 14);
        }
      }
      return true;
    }

    const tokens =
      (Array.isArray(ch.correctTokens) && ch.correctTokens.length > 0
        ? ch.correctTokens
        : null) ||
      (blankTokens.length > 0 ? blankTokens : null) ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions.length > 0
        ? ch.correctSolutions
        : null) ||
      (ch.bestSolution ? [ch.bestSolution] : null) ||
      (Array.isArray(ch.choices) && typeof ch.correctIndex === "number"
        ? [ch.choices[ch.correctIndex]]
        : null);

    if (tokens) {
      return await tapWordSequence(scope, tokens, 38);
    }

    return false;
  }

  async function solveTranslate(ch, scope) {
    if (!ch) return false;

    const bank = scope.querySelector('[data-test="word-bank"]');
    if (bank) {
      if (Array.isArray(ch.correctTokens) && ch.correctTokens.length > 0) {
        if (await tapWordSequence(scope, ch.correctTokens, 36)) {
          return true;
        }
      }
      const fallbackSol =
        ch.bestSolution ||
        (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
        ch.solutionTranslation;
      if (fallbackSol) {
        if (await tapSolutionGreedyFromBank(scope, fallbackSol)) {
          return true;
        }
      }
    }

    const solution =
      ch.bestSolution ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
      ch.solutionTranslation ||
      (Array.isArray(ch.correctTokens) && ch.correctTokens.join(" "));

    if (solution) {
      const input = scope.querySelector(
        'textarea[data-test="challenge-translate-input"], input[data-test="challenge-text-input"]',
      );
      if (input && isVisibleElement(input)) {
        await typewriteReactInput(input, solution);
        return true;
      }
    }

    return false;
  }

  async function solveGenericInput(ch, scope) {
    if (!ch) return false;
    const chType = getChallengeType(ch);
    const solution =
      ch.answer ??
      ch.correctAnswer ??
      ch.bestSolution ??
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ??
      ch.solutionTranslation ??
      ch.sampleResponse ??
      ch.exampleResponse ??
      ch.prompt;

    const input = scope.querySelector(
      'textarea:not(:disabled), input[type="text"]:not(:disabled), input[type="number"]:not(:disabled), input:not([type]):not(:disabled)',
    );
    if (input && isVisibleElement(input) && !input.closest("#cerolingoModMenu")) {
      if (solution != null && solution !== "") {
        await typewriteReactInput(input, String(solution));
        return true;
      }
      if (chType === "freeResponse") {
        const skipBtn = document.querySelector('[data-test="player-skip"]');
        if (isButtonEnabled(skipBtn)) {
          await botClick(skipBtn);
          return true;
        }
      }
    }
    return false;
  }

  async function solveListenMatch(ch, scope) {
    if (scope.querySelector('[data-test="word-bank"]')) return false;
    const chType = getChallengeType(ch);
    // Handle pure text boards in one pass
    if (
      (chType === "match" || chType === "characterMatch" || chType === "extendedMatch") &&
      Array.isArray(ch?.pairs) &&
      ch.pairs.length > 0
    ) {
      return false;
    }

    const now = Date.now();
    const allButtons = Array.from(
      scope.querySelectorAll(
        'button[data-test*="-challenge-tap-token"]:not([disabled]):not([aria-disabled="true"])',
      ),
    ).filter(
      (b) =>
        isVisibleElement(b) &&
        now - Number(b._cerolingoMatchedAt || 0) >= 900,
    );
    if (allButtons.length < 2) return false;

    const groups = new Map();
    for (const btn of allButtons) {
      const dt = btn.getAttribute("data-test");
      if (!groups.has(dt)) groups.set(dt, []);
      groups.get(dt).push(btn);
    }

    let matched = false;
    let showedListenFx = false;
    for (const pairBtns of groups.values()) {
      if (pairBtns.length === 2) {
        if (!isButtonEnabled(pairBtns[0]) || !isButtonEnabled(pairBtns[1])) {
          continue;
        }
        if (!showedListenFx) {
          showedListenFx = true;
          spawnAudioListenFx(scope);
        }
        const t = Date.now();
        pairBtns[0]._cerolingoMatchedAt = t;
        pairBtns[1]._cerolingoMatchedAt = t;
        matched = true;
        await botClick(pairBtns[0], { minDebounce: 80, mode: "match" });
        await sleep(isFxEnabled() ? jitter(44, 14) : 16);
        spawnMatchLink(pairBtns[0], pairBtns[1]);
        await botClick(pairBtns[1], { minDebounce: 80, mode: "match" });
        await sleep(isFxEnabled() ? jitter(60, 16) : 20);
      }
    }

    return matched;
  }

  async function solveMatch(ch, scope) {
    if (scope.querySelector('[data-test="word-bank"]')) return false;
    if (!ch || !Array.isArray(ch.pairs)) return false;

    const matchedInPass = new Set();
    let matched = false;

    for (const pair of ch.pairs) {
      const leftWords = [
        pair.learningToken,
        pair.learningWord,
        pair.character,
        pair.phrase,
        pair.token,
      ].filter(Boolean);
      const rightWords = [
        pair.fromToken,
        pair.fromWord,
        pair.translation,
        pair.transliteration,
        pair.toToken,
      ].filter(Boolean);
      const allWords = [...leftWords, ...rightWords];

      if (allWords.length < 2) continue;

      const now = Date.now();
      const available = Array.from(
        scope.querySelectorAll(
          'button[data-test*="-challenge-tap-token"]:not([disabled]):not([aria-disabled="true"])',
        ),
      ).filter(
        (b) =>
          isVisibleElement(b) &&
          !matchedInPass.has(b) &&
          now - Number(b._cerolingoMatchedAt || 0) >= 900,
      );

      const findBtn = (wordList, exclude) => {
        for (const w of wordList) {
          const found = available.find(
            (b) => b !== exclude && buttonMatchesToken(b, w),
          );
          if (found) return found;
        }
        return null;
      };

      // Match left-to-right pairs first
      let btn1 = findBtn(leftWords, null);
      let btn2 = btn1 ? findBtn(rightWords, btn1) : null;

      if (!btn1 || !btn2) {
        btn1 = null;
        btn2 = null;
        for (const word of allWords) {
          if (!btn1) btn1 = findBtn([word], null);
          else if (!btn2) btn2 = findBtn([word], btn1);
          if (btn1 && btn2) break;
        }
      }

      if (btn1 && btn2) {
        const t = Date.now();
        btn1._cerolingoMatchedAt = t;
        btn2._cerolingoMatchedAt = t;
        matched = true;
        matchedInPass.add(btn1);
        matchedInPass.add(btn2);
        await botClick(btn1, { minDebounce: 80, mode: "match" });
        await sleep(isFxEnabled() ? jitter(44, 14) : 16);
        spawnMatchLink(btn1, btn2);
        await botClick(btn2, { minDebounce: 80, mode: "match" });
        await sleep(isFxEnabled() ? jitter(60, 16) : 20);
      }
    }

    return matched;
  }

  // Main loop
  function isStoryLessonPage(href) {
    if (href.includes("/story") || href.includes("/stories")) return true;
    return Boolean(
      document.querySelector(
        '[data-test="stories-element"], button[data-test="story-start"], button[data-test="stories-player-continue"], button[data-test="stories-player-done"], button[data-test="stories-choice"], img[src*="stories-cdn.duolingo.com"]',
      ),
    );
  }

  function isActiveLessonRoute(href) {
    let pathname = "";
    try {
      pathname = new URL(href).pathname;
    } catch {
      pathname = href;
    }
    if (
      pathname.includes("/lesson") ||
      pathname === "/practice" ||
      pathname.startsWith("/practice/") ||
      pathname.includes("/mistakes-review") ||
      pathname.includes("/skill/") ||
      pathname.includes("/alphabets")
    ) {
      return true;
    }
    if (
      pathname.startsWith("/practice-hub/") ||
      pathname.includes("/placement") ||
      pathname.includes("/checkpoint") ||
      pathname.includes("/test")
    ) {
      return Boolean(
        document.querySelector(
          '[data-test^="challenge "], [data-test="player-next"]',
        ),
      );
    }
    return false;
  }

  async function handleChallengeStep() {
    if (localStorage.getItem("autoSolver") === "false") {
      hideBotVisuals();
      return;
    }

    const href = window.location.href;
    if (isSolvingChallenge) return;

    if (!isActiveLessonRoute(href)) {
      if (!isStoryLessonPage(href)) {
        hideBotVisuals();
      }
      return;
    }

    if (isStoryLessonPage(href)) {
      return;
    }

    // Advance if feedback banner is already visible
    if (hasBlameBannerVisible()) {
      isSolvingChallenge = true;
      try {
        await clickNext(false, { minDebounce: 70 });
      } finally {
        isSolvingChallenge = false;
      }
      return;
    }

    const activeEl = getActiveChallengeEl();
    if (findNextButton(Boolean(activeEl))) {
      isSolvingChallenge = true;
      try {
        await clickNext(Boolean(activeEl), { minDebounce: 85 });
      } finally {
        isSolvingChallenge = false;
      }
      return;
    }

    isSolvingChallenge = true;
    try {
      const scope = activeEl || document;
      const ch = getChallenge(activeEl);
      let solved = false;

      if (await solveSpeak(ch, scope)) {
        solved = true;
      } else if (await solveCharacterTrace(ch)) {
        solved = true;
      } else if (await solveListenMatch(ch, scope)) {
        solved = true;
      } else if (await solveMatch(ch, scope)) {
        solved = true;
      } else if (await solveName(ch, scope)) {
        solved = true;
      } else if (await solveRadioBinary(ch, scope)) {
        solved = true;
      } else if (await solveAssist(ch, scope)) {
        solved = true;
      } else if (await solveListen(ch, scope)) {
        solved = true;
      } else if (await solveCompleteReverseTranslation(ch, scope)) {
        solved = true;
      } else if (await solvePatternTapComplete(ch, scope)) {
        solved = true;
      } else if (await solveTranslate(ch, scope)) {
        solved = true;
      } else if (await solveGenericInput(ch, scope)) {
        solved = true;
      }

      if (solved) {
        await clickCheckAndContinue();
      }
    } finally {
      isSolvingChallenge = false;
    }
  }

  setInterval(handleChallengeStep, 75);
})();
