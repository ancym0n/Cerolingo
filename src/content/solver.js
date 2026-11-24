loadedLog("solver");

let storySolverInterval = null;
let isStoryStepRunning = false;

const STORY_CURSOR_ID = "cerolingoVirtualCursor";
const STORY_SOLVING_BAR_ID = "cerolingoSolvingBar";
const STORY_CURSOR_IDLE_MS = 380;
const STORY_SOLVING_IDLE_MS = 460;

const storySleep = (ms) => new Promise((r) => setTimeout(r, ms));
const storyJitter = (base, spread = 14) =>
  Math.max(10, Math.round(base + (Math.random() - 0.5) * spread));
const isStoryFxEnabled = () => localStorage.getItem("botHighlight") !== "false";

// Virtual cursor and overlay effects
function storyEnsureSolvingBar() {
  let bar = document.getElementById(STORY_SOLVING_BAR_ID);
  if (!bar && document.body) {
    bar = document.createElement("div");
    bar.id = STORY_SOLVING_BAR_ID;
    document.body.appendChild(bar);
  }
  return bar;
}

function storyMarkSolvingActive() {
  if (!isStoryFxEnabled() || !document.body) return;
  const now = Date.now();
  document.body.dataset.cerolingoSolving = "true";
  document.body.dataset.cerolingoSolvingAt = String(now);
  const bar = storyEnsureSolvingBar();
  if (bar) bar.classList.add("is-active");

  setTimeout(() => {
    if (!document.body) return;
    const last = Number(document.body.dataset.cerolingoSolvingAt || 0);
    if (Date.now() - last >= STORY_SOLVING_IDLE_MS - 15) {
      delete document.body.dataset.cerolingoSolving;
      const b = document.getElementById(STORY_SOLVING_BAR_ID);
      if (b) b.classList.remove("is-active");
    }
  }, STORY_SOLVING_IDLE_MS);
}

function storyCreateSvgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function storyEnsureVirtualCursor() {
  let cursor = document.getElementById(STORY_CURSOR_ID);
  if (cursor && cursor.dataset.v === "2") return cursor;
  if (cursor) cursor.remove();
  if (!document.body) return null;

  cursor = document.createElement("div");
  cursor.id = STORY_CURSOR_ID;
  cursor.dataset.v = "2";
  cursor.setAttribute("data-mode", "click");

  const tilt = document.createElement("div");
  tilt.className = "cerolingo-cursor-tilt";

  const inner = document.createElement("div");
  inner.className = "cerolingo-cursor-inner";

  const halo = document.createElement("div");
  halo.className = "cerolingo-cursor-halo";

  const pointerD =
    "M10.2 5.4 C7.0 3.8 4.1 6.7 5.5 9.9 L14.4 31.8 C15.7 35.0 20.1 35.1 21.7 32.1 L24.8 26.2 L31.6 24.1 C34.9 23.0 35.4 18.6 32.3 16.9 Z";
  const svg = storyCreateSvgEl("svg", {
    viewBox: "0 0 42 42",
    width: 44,
    height: 44,
    class: "cerolingo-cursor-svg",
  });
  svg.appendChild(
    storyCreateSvgEl("path", {
      class: "cerolingo-cursor-shadow-path",
      transform: "translate(0, 3.8)",
      d: pointerD,
    }),
  );
  svg.appendChild(
    storyCreateSvgEl("path", {
      class: "cerolingo-cursor-body-path",
      d: pointerD,
    }),
  );
  svg.appendChild(
    storyCreateSvgEl("path", {
      class: "cerolingo-cursor-shine-path",
      d: "M12.6 10.6 L25.6 17.6",
    }),
  );

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
  const micSvg = storyCreateSvgEl("svg", {
    viewBox: "0 0 24 24",
    class: "cerolingo-badge-icon",
  });
  micSvg.appendChild(
    storyCreateSvgEl("rect", {
      x: 9,
      y: 3,
      width: 6,
      height: 11,
      rx: 3,
      fill: "#ffffff",
    }),
  );
  micSvg.appendChild(
    storyCreateSvgEl("path", {
      d: "M5 11a7 7 0 0 0 14 0 M12 18v3",
      fill: "none",
      stroke: "#ffffff",
      "stroke-width": 2.4,
      "stroke-linecap": "round",
    }),
  );
  micSvg.appendChild(
    storyCreateSvgEl("path", {
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
  const matchSvg = storyCreateSvgEl("svg", {
    viewBox: "0 0 24 24",
    class: "cerolingo-badge-icon",
  });
  matchSvg.appendChild(
    storyCreateSvgEl("rect", {
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
    storyCreateSvgEl("rect", {
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
  const confirmSvg = storyCreateSvgEl("svg", {
    viewBox: "0 0 24 24",
    class: "cerolingo-badge-icon",
  });
  confirmSvg.appendChild(
    storyCreateSvgEl("path", {
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

function hideStoryVisuals() {
  const cursor = document.getElementById(STORY_CURSOR_ID);
  if (cursor) {
    cursor.classList.remove("is-visible", "is-pressing");
    cursor.setAttribute("data-mode", "click");
  }
  const bar = document.getElementById(STORY_SOLVING_BAR_ID);
  if (bar) {
    bar.classList.remove("is-active");
  }
  if (document.body) {
    delete document.body.dataset.cerolingoSolving;
  }
}

function storySpawnMotionTrail(x1, y1, x2, y2, glideMs) {
  if (!isStoryFxEnabled() || !document.body) return;
  const steps = [0.28, 0.56, 0.8];
  steps.forEach((t, idx) => {
    setTimeout(() => {
      if (!isStoryFxEnabled() || !document.body) return;
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

function storyMoveCursorTo(x, y, mode = "click") {
  if (!isStoryFxEnabled()) return 0;
  const cursor = storyEnsureVirtualCursor();
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
    storySpawnMotionTrail(prevX, prevY, x, y, glideMs);
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
  cursor.dataset.lastActiveAt = String(Date.now());

  cursor.style.transitionDuration = `${glideMs}ms, 240ms`;
  cursor.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  cursor.classList.add("is-visible");

  setTimeout(() => {
    const live = document.getElementById(STORY_CURSOR_ID);
    if (!live) return;
    const last = Number(live.dataset.lastActiveAt || 0);
    if (Date.now() - last >= STORY_CURSOR_IDLE_MS - 15) {
      live.classList.remove("is-visible", "is-pressing");
      live.setAttribute("data-mode", "click");
    }
  }, STORY_CURSOR_IDLE_MS);

  return glideMs;
}

function storyPulseCursorPress() {
  const cursor = document.getElementById(STORY_CURSOR_ID);
  if (!cursor) return;
  cursor.classList.remove("is-pressing");
  void cursor.offsetWidth;
  cursor.classList.add("is-pressing");
  setTimeout(() => {
    cursor.classList.remove("is-pressing");
  }, 95);
}

function storySpawnClickBurst(x, y, mode = "click") {
  if (!isStoryFxEnabled() || !document.body) return;
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

function storySpawnMatchLink(el1, el2) {
  if (!el1 || !el2 || !isStoryFxEnabled() || !document.body) return;
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

  const svg = storyCreateSvgEl("svg", { class: "cerolingo-fx-match-line" });
  const outer = storyCreateSvgEl("path", { class: "cerolingo-fx-match-path", d });
  outer.style.setProperty("--line-len", String(approxLen));
  const core = storyCreateSvgEl("path", {
    class: "cerolingo-fx-match-path-core",
    d,
  });
  core.style.setProperty("--line-len", String(approxLen));

  svg.append(outer, core);
  document.body.appendChild(svg);
  setTimeout(() => svg.remove(), 460);
}

function storySpawnKeycapPop(wrap, label, progress = 0.5) {
  if (!wrap || !isStoryFxEnabled() || !document.body) return;
  const rect = wrap.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;

  const key = document.createElement("div");
  key.className = "cerolingo-fx-keycap";
  key.textContent = label === " " ? "␣" : String(label).slice(0, 2);

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

function spawnStoryFxOverlay(el, mode = "click") {
  if (!el || !isStoryFxEnabled() || !document.body) return;

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

function storyApplyTransientPress(el) {
  if (!el || !isStoryFxEnabled()) return;
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

async function storyEnsureInViewport(el) {
  if (!el || !el.isConnected) return;
  const rect = el.getBoundingClientRect();
  if (rect.bottom < 8 || rect.top > window.innerHeight - 8) {
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      await storySleep(55);
    } catch {}
  }
}

async function storyClick(el, opts = {}) {
  if (
    !el ||
    !el.isConnected ||
    el.disabled ||
    el.getAttribute?.("aria-disabled") === "true"
  ) {
    return false;
  }
  const now = Date.now();
  const minDebounce = opts.minDebounce ?? 120;
  if (now - Number(el._cerolingoLastStoryClickAt || 0) < minDebounce) {
    return false;
  }
  el._cerolingoLastStoryClickAt = now;

  if (!isStoryFxEnabled()) {
    el.click();
    return true;
  }

  await storyEnsureInViewport(el);
  if (
    !el.isConnected ||
    el.disabled ||
    el.getAttribute?.("aria-disabled") === "true"
  ) {
    return false;
  }

  const mode = opts.mode || "click";
  storyMarkSolvingActive();

  const rect = el.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) {
    const jx = (Math.random() - 0.5) * Math.min(8, rect.width * 0.22);
    const jy = (Math.random() - 0.5) * Math.min(6, rect.height * 0.22);
    const targetX = rect.left + rect.width * 0.5 + jx;
    const targetY = rect.top + rect.height * 0.5 + jy;

    const glideMs = storyMoveCursorTo(targetX, targetY, mode);
    if (glideMs > 0) {
      await storySleep(Math.max(36, glideMs - 14));
    }

    storyPulseCursorPress();
    spawnStoryFxOverlay(el, mode);
    storySpawnClickBurst(targetX, targetY, mode);
    storyApplyTransientPress(el);
    await storySleep(24);
  }

  if (
    el.isConnected &&
    !el.disabled &&
    el.getAttribute?.("aria-disabled") !== "true"
  ) {
    el.click();
  }
  await storySleep(16);
  return true;
}

function storySetReactInputValue(el, value) {
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

async function storyTypewriteInput(el, value) {
  if (!el || !value) return;
  const str = String(value);
  if (normText(el.value) === normText(str)) return;

  if (!isStoryFxEnabled()) {
    el.focus();
    storySetReactInputValue(el, str);
    return;
  }

  await storyEnsureInViewport(el);
  storyMarkSolvingActive();

  const wrap = el.closest("label") || el;
  const rect = wrap.getBoundingClientRect();
  let halo = null;
  if (rect.width > 0 && rect.height > 0) {
    const tx = rect.left + Math.min(rect.width * 0.28, 72);
    const ty = rect.top + rect.height * 0.5;
    const glideMs = storyMoveCursorTo(tx, ty, "typing");
    if (glideMs > 0) await storySleep(Math.max(30, glideMs - 12));
    storyPulseCursorPress();
    storySpawnClickBurst(tx, ty, "typing");

    const parkX = Math.min(window.innerWidth - 70, rect.right - 22);
    const parkY = Math.max(28, rect.top + rect.height * 0.45);
    storyMoveCursorTo(parkX, parkY, "typing");

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

  el.classList.add("cerolingo-bot-typing");
  if (wrap !== el) wrap.classList.add("cerolingo-bot-typing");
  el.focus();

  const totalSteps = Math.min(str.length, 12);
  const stepSize = Math.max(1, Math.ceil(str.length / totalSteps));
  const keycapInterval = Math.max(1, Math.ceil(totalSteps / 4));
  let stepIdx = 0;

  for (let i = stepSize; i < str.length; i += stepSize) {
    if (!el.isConnected) break;
    storyMarkSolvingActive();
    storySetReactInputValue(el, str.slice(0, i));
    if (stepIdx % keycapInterval === 0) {
      storySpawnKeycapPop(wrap, str[i - 1], i / str.length);
    }
    stepIdx++;
    await storySleep(storyJitter(16, 6));
  }
  if (el.isConnected) {
    storySetReactInputValue(el, str);
    storySpawnKeycapPop(wrap, str[str.length - 1], 0.95);
  }
  await storySleep(34);

  if (el.isConnected) {
    el.classList.add("cerolingo-bot-typing-out");
    el.classList.remove("cerolingo-bot-typing");
    setTimeout(() => {
      if (el.isConnected) el.classList.remove("cerolingo-bot-typing-out");
    }, 240);
  }
  if (wrap !== el && wrap.isConnected) {
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

function stopStorySolver() {
  if (storySolverInterval) {
    clearInterval(storySolverInterval);
    storySolverInterval = null;
  }
  isStoryStepRunning = false;
  hideStoryVisuals();
}

// Text normalization & token lookup
function normText(str) {
  return typeof str === "string"
    ? str.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

function cleanStoryToken(str) {
  return normText(str)
    .toLowerCase()
    .replace(/…/g, "...")
    .replace(/[’‘‚`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+([?.!,;:])/g, "$1")
    .replace(/^[?.!,;:"'¡¿…\s-]+|[?.!,;:"'¡¿…\s-]+$/g, "")
    .trim();
}

function isStoryTokenEqual(a, b) {
  const na = normText(a);
  const nb = normText(b);
  if (!na || !nb) return false;
  if (na === nb || na.toLowerCase() === nb.toLowerCase()) return true;
  const ca = cleanStoryToken(na);
  const cb = cleanStoryToken(nb);
  return Boolean(ca && cb && ca === cb);
}

function getStoryChoiceCandidates(btn) {
  if (!btn) return [];
  const rawBtn = btn.innerText || btn.textContent || "";
  const btnText = normText(rawBtn);
  const strippedText = normText(rawBtn.replace(/^\s*\d+[\s.\r\n)-]+/, ""));

  const candidates = [];
  if (btnText) candidates.push(btnText);
  if (strippedText) candidates.push(strippedText);

  // Read sibling/parent label only for unlabeled radio/checkbox controls
  const hasOwnLabel = Boolean(strippedText || (btnText && !/^\d+$/.test(btnText)));
  if (!hasOwnLabel) {
    const nextEl = btn.nextElementSibling;
    if (
      nextEl &&
      nextEl.tagName !== "BUTTON" &&
      nextEl.getAttribute?.("data-test") !== "stories-choice" &&
      !nextEl.querySelector?.('button[data-test="stories-choice"]')
    ) {
      const siblingText = normText(nextEl.innerText || nextEl.textContent);
      if (siblingText) candidates.push(siblingText);
    }

    const parent = btn.parentElement;
    if (
      parent &&
      parent.querySelectorAll('button[data-test="stories-choice"]').length === 1
    ) {
      const parentRaw = parent.innerText || parent.textContent || "";
      const parentText = normText(parentRaw);
      const parentStripped = normText(
        parentRaw.replace(/^\s*\d+[\s.\r\n)-]+/, ""),
      );
      if (parentText) candidates.push(parentText);
      if (parentStripped) candidates.push(parentStripped);
    }
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function getStoryTokenCandidates(btn) {
  if (!btn) return [];
  const candidates = new Set();
  const add = (val) => {
    const n = normText(val);
    if (n) candidates.add(n);
  };

  const label = btn.querySelector('[data-test="challenge-tap-token-text"]');
  if (label) {
    add(label.textContent);
    add(label.innerText);
  }

  const rawInner = btn.innerText || "";
  const rawText = btn.textContent || "";
  add(rawInner);
  add(rawText);
  add(rawInner.replace(/^\s*\d+[\s.\r\n)-]+/, ""));
  add(rawText.replace(/^\s*\d+[\s.\r\n)-]+/, ""));

  // Strip hotkey digits only when text remains
  const strippedInner = normText(rawInner.replace(/[\d\r\n]/g, ""));
  if (strippedInner) add(strippedInner);
  const strippedText = normText(rawText.replace(/[\d\r\n]/g, ""));
  if (strippedText) add(strippedText);

  const dt = btn.getAttribute?.("data-test") || "";
  // "my house" can be encoded as "house-challenge-tap-token my".
  const dtMatch = dt.match(/^(.*?)-challenge-tap-token(?:\s+(.*))?$/);
  if (dtMatch) {
    add(dtMatch[1]);
    if (dtMatch[2]) add(`${dtMatch[2]} ${dtMatch[1]}`);
  }

  return Array.from(candidates);
}

function doesButtonMatchStoryAnswer(btn, ans) {
  if (!btn || !ans) return false;
  return getStoryTokenCandidates(btn).some((cand) =>
    isStoryTokenEqual(cand, ans),
  );
}

function getTapTokenElements(root = document) {
  const raw = Array.from(
    root.querySelectorAll('[data-test*="challenge-tap-token"]'),
  );
  const result = [];
  const seen = new Set();

  for (const el of raw) {
    let target = el;
    if (el.getAttribute("data-test") === "challenge-tap-token-text") {
      target =
        el.closest(
          'button, [role="button"], [data-test*="challenge-tap-token"]:not([data-test="challenge-tap-token-text"])',
        ) || el.parentElement;
    } else if (el.tagName !== "BUTTON") {
      target = el.querySelector("button") || el.closest("button") || el;
    }
    if (target && !seen.has(target)) {
      seen.add(target);
      result.push(target);
    }
  }
  return result;
}

function isElementActiveInStory(el) {
  if (
    !el ||
    !el.isConnected ||
    el.disabled ||
    el.getAttribute("aria-disabled") === "true" ||
    el.closest("[inert]")
  ) {
    return false;
  }
  let curr = el;
  while (curr && curr !== document.body) {
    const style = window.getComputedStyle(curr);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0 ||
      style.pointerEvents === "none"
    ) {
      return false;
    }
    curr = curr.parentElement;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Story data & answer extraction
function readCachedStoryData() {
  const cached = document.documentElement?.getAttribute(
    "data-cerolingo-story-json",
  );
  if (!cached) return null;
  try {
    const parsed = JSON.parse(cached);
    if (parsed && Array.isArray(parsed.elements)) {
      return parsed;
    }
  } catch {}
  return null;
}

async function fetchStoryData(url) {
  for (let i = 0; i < 15; i++) {
    const cached = readCachedStoryData();
    if (cached) return cached;
    await storySleep(80);
  }

  const cookies = document.cookie;
  const jwtToken = cookies.match(/jwt_token=([^;]*)/)?.[1];
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (jwtToken) {
    headers.Authorization = `Bearer ${jwtToken}`;
  }

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  return response.json();
}

function extractOptionText(raw) {
  if (typeof raw === "string") return normText(raw);
  return normText(raw?.text ?? raw?.phrase ?? raw?.content?.text ?? "");
}

function buildChoiceQuestions(questionList) {
  const questions = [];
  for (const element of questionList) {
    if (
      !element ||
      (element.type !== "MULTIPLE_CHOICE" &&
        element.type !== "SELECT_PHRASE" &&
        element.type !== "GAP_FILL")
    ) {
      continue;
    }

    const list = Array.isArray(element.answers)
      ? element.answers
      : Array.isArray(element.choices)
        ? element.choices
        : [];
    const options = list.map(extractOptionText).filter(Boolean);
    const correct = [];

    if (Array.isArray(element.correctIndices) && element.correctIndices.length > 0) {
      for (const i of element.correctIndices) {
        const text = extractOptionText(list[i]);
        if (text) correct.push(text);
      }
    } else {
      const idx =
        typeof element.correctAnswerIndex === "number"
          ? element.correctAnswerIndex
          : element.correctIndex;
      if (typeof idx === "number" && list[idx] !== undefined) {
        const text = extractOptionText(list[idx]);
        if (text) correct.push(text);
      }
    }

    const prompt = normText(
      element.question?.text ??
        element.prompt?.text ??
        element.line?.content?.text ??
        "",
    );

    if (correct.length > 0) {
      questions.push({
        type: element.type,
        options,
        correct,
        prompt,
      });
    }
  }
  return questions;
}

function extractFreeformFallback(elements) {
  for (const el of elements) {
    if (!el) continue;
    if (el.type === "FREEFORM_WRITING_EXAMPLE_RESPONSE") {
      const txt = normText(
        el.text ?? el.exampleResponse ?? el.content?.text ?? el.line?.content?.text,
      );
      if (txt) return txt;
    }
    if (el.type === "FREEFORM_WRITING" || el.type === "TYPE_TEXT") {
      const txt = normText(el.exampleResponse ?? el.sampleAnswer ?? el.answer);
      if (txt) return txt;
    }
  }
  // Fallback to dialogue lines from the story
  const lines = elements
    .filter((el) => el?.type === "LINE")
    .map((el) => normText(el.line?.content?.text ?? el.content?.text))
    .filter((t) => t.length >= 6);
  if (lines.length > 0) {
    return lines.slice(0, 2).join(" ");
  }
  return "This story was interesting.";
}

function buildAnswerSets(data) {
  const elements = Array.isArray(data?.elements) ? data.elements : [];
  const questionList = elements.filter(
    (item) =>
      item &&
      item.type !== "LINE" &&
      item.type !== "CHALLENGE_PROMPT" &&
      item.type !== "HEADER",
  );

  return {
    answerMP: getAnswers(questionList, "MULTIPLE_CHOICE", elements),
    answerSP: getAnswers(questionList, "SELECT_PHRASE", elements),
    answerPTP: getAnswers(questionList, "POINT_TO_PHRASE", elements),
    answerA: getAnswers(questionList, "ARRANGE", elements),
    answerM: getAnswers(questionList, "MATCH", elements),
    answerGF: getAnswers(questionList, "GAP_FILL", elements),
    choiceQuestions: buildChoiceQuestions(questionList),
    freeformFallback: extractFreeformFallback(elements),
  };
}

function pickBestChoiceQuestion(choiceList, choiceQuestions) {
  if (!Array.isArray(choiceQuestions) || choiceQuestions.length === 0) {
    return null;
  }

  const domButtonCandidates = choiceList.map(getStoryChoiceCandidates);
  const pageText = normText(document.body?.innerText || "").toLowerCase();

  let best = null;
  let bestScore = -1;

  for (const q of choiceQuestions) {
    if (q.options.length === 0) continue;

    let matchedDomCount = 0;
    for (const cands of domButtonCandidates) {
      const hitsOption = q.options.some((opt) =>
        cands.some((c) => isStoryTokenEqual(c, opt)),
      );
      if (hitsOption) matchedDomCount++;
    }

    if (matchedDomCount === 0) continue;

    const exactCountMatch =
      matchedDomCount === choiceList.length &&
      q.options.length === choiceList.length;
    const allDomMatched = matchedDomCount === choiceList.length;
    const promptVisible =
      q.prompt.length >= 4 && pageText.includes(q.prompt.toLowerCase());

    const score =
      matchedDomCount * 10 +
      (allDomMatched ? 40 : 0) +
      (exactCountMatch ? 30 : 0) +
      (promptVisible ? 50 : 0);

    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }

  return bestScore >= 20 ? best : null;
}

// Story solver loop
async function autoAnswerBot(url) {
  stopStorySolver();

  let answerMP = [];
  let answerSP = [];
  let answerPTP = [];
  let answerA = [];
  let answerM = [];
  let answerGF = [];
  let choiceQuestions = [];
  let freeformFallback = "This story was interesting.";
  let lastCachedAttr = null;
  let fetchedUrl = null;
  let fetchingUrl = false;

  const hasAnyAnswers = () =>
    answerMP.length +
      answerSP.length +
      answerPTP.length +
      answerA.length +
      answerM.length +
      answerGF.length >
    0;

  const applyData = (data) => {
    if (!data || !Array.isArray(data.elements)) return;
    const sets = buildAnswerSets(data);
    answerMP = sets.answerMP;
    answerSP = sets.answerSP;
    answerPTP = sets.answerPTP;
    answerA = sets.answerA;
    answerM = sets.answerM;
    answerGF = sets.answerGF;
    choiceQuestions = sets.choiceQuestions;
    freeformFallback = sets.freeformFallback;
  };

  const tryFetchFromUrl = async (targetUrl) => {
    if (!targetUrl || fetchingUrl || targetUrl === fetchedUrl) return;
    fetchingUrl = true;
    fetchedUrl = targetUrl;
    try {
      const data = await fetchStoryData(targetUrl);
      applyData(data);
    } catch (error) {
      cerolingoLog("solver", "Error fetching story JSON", error);
    } finally {
      fetchingUrl = false;
    }
  };

  const tryClickContinueSoon = async () => {
    await storySleep(isStoryFxEnabled() ? 55 : 18);
    const cont = document.querySelector(
      'button[data-test="stories-player-continue"]',
    );
    if (
      cont &&
      !cont.disabled &&
      cont.getAttribute("aria-disabled") !== "true" &&
      isElementActiveInStory(cont)
    ) {
      await storyClick(cont, { minDebounce: 85, mode: "confirm" });
      return true;
    }
    return false;
  };

  const runStoryStep = async () => {
    if (localStorage.getItem("autoSolver") === "false") {
      hideStoryVisuals();
      return;
    }
    if (isStoryStepRunning) return;

    isStoryStepRunning = true;
    try {
      const now = Date.now();

  
      const storyStartButton = document.querySelector(
        'button[data-test="story-start"]',
      );
      if (
        storyStartButton &&
        !storyStartButton.disabled &&
        storyStartButton.getAttribute("aria-disabled") !== "true" &&
        isElementActiveInStory(storyStartButton) &&
        now - (storyStartButton._cerolingoStartClickedAt || 0) >= 350
      ) {
        storyStartButton._cerolingoStartClickedAt = now;
        await storyClick(storyStartButton, { mode: "confirm" });
        return;
      }

  
      const currentCachedAttr = document.documentElement?.getAttribute(
        "data-cerolingo-story-json",
      );
      if (currentCachedAttr && currentCachedAttr !== lastCachedAttr) {
        lastCachedAttr = currentCachedAttr;
        const parsed = readCachedStoryData();
        if (parsed) applyData(parsed);
      }

      if (!hasAnyAnswers() && !fetchingUrl) {
        const discoveredUrl =
          typeof findStoryJsonUrl === "function"
            ? findStoryJsonUrl()
            : document.documentElement?.getAttribute("data-cerolingo-story-url");
        if (discoveredUrl && discoveredUrl !== fetchedUrl) {
          tryFetchFromUrl(discoveredUrl);
        }
      }

  
      const continueButton = document.querySelector(
        'button[data-test="stories-player-continue"]',
      );
      if (
        continueButton &&
        !continueButton.disabled &&
        continueButton.getAttribute("aria-disabled") !== "true" &&
        isElementActiveInStory(continueButton)
      ) {
        await storyClick(continueButton, { minDebounce: 95, mode: "confirm" });
        return;
      }

  
      const allChoiceButtons = Array.from(
        document.querySelectorAll('button[data-test="stories-choice"]'),
      ).filter(
        (btn) => !btn.disabled && btn.getAttribute("aria-disabled") !== "true",
      );
      const visibleChoices = allChoiceButtons.filter(isElementActiveInStory);
      const flatChoiceAnswers = [...answerSP, ...answerMP, ...answerGF];

      const tryClickChoices = async (choiceList) => {
        if (choiceList.length === 0) return false;

        const scopedQuestion = pickBestChoiceQuestion(
          choiceList,
          choiceQuestions,
        );
        const targetAnswers = scopedQuestion
          ? scopedQuestion.correct
          : flatChoiceAnswers;
        const singleSelect = !scopedQuestion || scopedQuestion.correct.length === 1;

        let clicked = false;
        for (const btn of choiceList) {
          if (Date.now() - (btn._cerolingoChoiceClickedAt || 0) < 320) continue;
          const candidates = getStoryChoiceCandidates(btn);
          const matched = candidates.some((cand) =>
            targetAnswers.some((ans) => isStoryTokenEqual(cand, ans)),
          );
          if (matched) {
            btn._cerolingoChoiceClickedAt = Date.now();
            clicked = true;
            await storyClick(btn);
            if (singleSelect) break;
            await storySleep(isStoryFxEnabled() ? storyJitter(38, 12) : 14);
          }
        }
        return clicked;
      };

      const clickedChoice = await tryClickChoices(visibleChoices);
      if (clickedChoice) {
        await tryClickContinueSoon();
        return;
      }

  
      let handledTap = false;
      const allDomTapButtons = getTapTokenElements(document);
      const allTapButtons = allDomTapButtons.filter(
        (btn) => !btn.disabled && btn.getAttribute("aria-disabled") !== "true",
      );
      const visibleTapButtons = allTapButtons.filter(isElementActiveInStory);
      const challengeButtons =
        visibleTapButtons.length > 0 ? visibleTapButtons : allTapButtons;

      if (challengeButtons.length > 0) {
        const tryGapFill = async () => {
          const wordBank = document.querySelector('[data-test="word-bank"]');
          if (!wordBank || answerGF.length === 0) return false;
          const bankTokens = getTapTokenElements(wordBank).filter(
            (btn) =>
              !btn.disabled &&
              btn.getAttribute("aria-disabled") !== "true" &&
              isElementActiveInStory(btn),
          );
          const pool = bankTokens.length > 0 ? bankTokens : challengeButtons;

          const scopedGF = pickBestChoiceQuestion(
            pool,
            choiceQuestions.filter((q) => q.type === "GAP_FILL"),
          );
          const targets = scopedGF ? scopedGF.correct : answerGF;

          let clicked = false;
          for (const ans of targets) {
            const targetBtn = pool.find(
              (btn) =>
                Date.now() - (btn._cerolingoTapClickedAt || 0) >= 320 &&
                doesButtonMatchStoryAnswer(btn, ans),
            );
            if (targetBtn) {
              targetBtn._cerolingoTapClickedAt = Date.now();
              clicked = true;
              await storyClick(targetBtn);
              await storySleep(isStoryFxEnabled() ? storyJitter(38, 12) : 14);
              if (scopedGF && scopedGF.correct.length === 1) break;
            }
          }
          return clicked;
        };

        const tryArrange = async () => {
          if (answerA.length === 0) return false;
          const wordBank = document.querySelector('[data-test="word-bank"]');
          const bankDomButtons = wordBank
            ? getTapTokenElements(wordBank)
            : allDomTapButtons;

      
          let bestArrange = null;
          let bestScore = -1;
          for (const ansA of answerA) {
            if (!Array.isArray(ansA) || ansA.length === 0) continue;
            const allRequiredExist = ansA.every((a) =>
              allDomTapButtons.some((cbtn) =>
                doesButtonMatchStoryAnswer(cbtn, a),
              ),
            );
            if (!allRequiredExist) continue;

            const exactMatch = bankDomButtons.every((cbtn) =>
              ansA.some((a) => doesButtonMatchStoryAnswer(cbtn, a)),
            );
            const score = ansA.length * 10 + (exactMatch ? 100 : 0);
            if (score > bestScore) {
              bestScore = score;
              bestArrange = ansA;
            }
          }

          if (!bestArrange) return false;

          const used = new Set();
          let clicked = false;
          for (const a of bestArrange) {
            const livePool = (
              wordBank ? getTapTokenElements(wordBank) : getTapTokenElements(document)
            ).filter(
              (cbtn) =>
                !used.has(cbtn) &&
                !cbtn.disabled &&
                cbtn.getAttribute("aria-disabled") !== "true" &&
                isElementActiveInStory(cbtn) &&
                Date.now() - (cbtn._cerolingoTapClickedAt || 0) >= 250,
            );
            const targetBtn = livePool.find((cbtn) =>
              doesButtonMatchStoryAnswer(cbtn, a),
            );
            if (targetBtn) {
              used.add(targetBtn);
              targetBtn._cerolingoTapClickedAt = Date.now();
              clicked = true;
              await storyClick(targetBtn, { minDebounce: 80 });
              await storySleep(isStoryFxEnabled() ? storyJitter(38, 12) : 14);
            }
          }
          return clicked;
        };

        const tryPointToPhrase = async () => {
          if (answerPTP.length === 0) return false;
          let clicked = false;
          for (const btn of challengeButtons) {
            if (Date.now() - (btn._cerolingoTapClickedAt || 0) < 320) continue;
            if (answerPTP.some((ans) => doesButtonMatchStoryAnswer(btn, ans))) {
              btn._cerolingoTapClickedAt = Date.now();
              clicked = true;
              await storyClick(btn);
              break;
            }
          }
          return clicked;
        };

        const tryMatch = async () => {
          if (answerM.length === 0 || challengeButtons.length < 2) return false;
          const matchedInPass = new Set();
          let matchedAny = false;

          for (const match of answerM) {
            const liveButtons = getTapTokenElements(document).filter(
              (btn) =>
                !matchedInPass.has(btn) &&
                !btn.disabled &&
                btn.getAttribute("aria-disabled") !== "true" &&
                isElementActiveInStory(btn) &&
                Date.now() - (btn._cerolingoMatchedAt || 0) >= 750,
            );
            if (liveButtons.length < 2) break;

            const btn1 = liveButtons.find((btn) =>
              doesButtonMatchStoryAnswer(btn, match[0]),
            );
            const btn2 = btn1
              ? liveButtons.find(
                  (btn) =>
                    btn !== btn1 && doesButtonMatchStoryAnswer(btn, match[1]),
                )
              : null;

            if (btn1 && btn2) {
              const t = Date.now();
              btn1._cerolingoMatchedAt = t;
              btn2._cerolingoMatchedAt = t;
              matchedInPass.add(btn1);
              matchedInPass.add(btn2);
              matchedAny = true;
              await storyClick(btn1, { minDebounce: 80, mode: "match" });
              await storySleep(isStoryFxEnabled() ? storyJitter(44, 14) : 16);
              storySpawnMatchLink(btn1, btn2);
              await storyClick(btn2, { minDebounce: 80, mode: "match" });
              await storySleep(isStoryFxEnabled() ? storyJitter(60, 14) : 18);
            }
          }
          return matchedAny;
        };

        const isListLayout = challengeButtons.some((btn) =>
          Boolean(btn.closest("ul, li")),
        );

        if (isListLayout) {
          handledTap =
            (await tryMatch()) ||
            (await tryGapFill()) ||
            (await tryArrange()) ||
            (await tryPointToPhrase());
        } else {
          handledTap =
            (await tryGapFill()) ||
            (await tryArrange()) ||
            (await tryPointToPhrase()) ||
            (await tryMatch());
        }
      }

      if (handledTap) {
        await tryClickContinueSoon();
        return;
      }

  
      if (visibleChoices.length === 0 && allChoiceButtons.length > 0) {
        const clickedFallback = await tryClickChoices(allChoiceButtons);
        if (clickedFallback) {
          await tryClickContinueSoon();
          return;
        }
      }

  
      const endButton = document.querySelector(
        'button[data-test="stories-player-done"], button[data-test="player-next"], button[data-test="secondary-continue-button"], button[data-test="plus-no-thanks"], button[data-test="quests-continue-button"], button[data-test="notification-drawer-no-thanks-button"], button[data-test="practice-reminder-no-thanks"], button[data-test="streak-freeze-no-thanks"]',
      );
      if (
        endButton &&
        !endButton.disabled &&
        endButton.getAttribute("aria-disabled") !== "true" &&
        isElementActiveInStory(endButton)
      ) {
        await storyClick(endButton, { mode: "confirm" });
        return;
      }

  
      const textInput = document.querySelector(
        'textarea[data-test*="story"], textarea[data-test*="freeform"], textarea[data-test="challenge-translate-input"], textarea:not(:disabled)',
      );
      if (textInput && isElementActiveInStory(textInput) && !textInput.closest("#cerolingoModMenu")) {
        const skipButton = document.querySelector(
          'button[data-test="stories-player-skip"], button[data-test="player-skip"]',
        );
        if (
          skipButton &&
          !skipButton.disabled &&
          skipButton.getAttribute("aria-disabled") !== "true" &&
          isElementActiveInStory(skipButton)
        ) {
          await storyClick(skipButton);
          return;
        }
        if (!textInput.value?.trim()) {
          await storyTypewriteInput(textInput, freeformFallback);
          await tryClickContinueSoon();
        }
      }
    } finally {
      isStoryStepRunning = false;
    }
  };

  storySolverInterval = setInterval(runStoryStep, 70);

  const initialCached = readCachedStoryData();
  if (initialCached) {
    applyData(initialCached);
  }
  if (url) {
    await tryFetchFromUrl(url);
  }
}

function getAnswers(elements, type, allElements = []) {
  const filteredElements = elements.filter((item) => item?.type === type);
  const answers = [];

  filteredElements.forEach((element) => {
    try {
      if (type === "MULTIPLE_CHOICE" || type === "SELECT_PHRASE") {
        const list = Array.isArray(element.answers)
          ? element.answers
          : Array.isArray(element.choices)
            ? element.choices
            : [];
        const idx =
          typeof element.correctAnswerIndex === "number"
            ? element.correctAnswerIndex
            : element.correctIndex;
        if (typeof idx === "number" && list[idx] !== undefined) {
          const text = extractOptionText(list[idx]);
          if (text) answers.push(text);
        }
        if (Array.isArray(element.correctIndices)) {
          element.correctIndices.forEach((i) => {
            const text = extractOptionText(list[i]);
            if (text) answers.push(text);
          });
        }
      } else if (type === "POINT_TO_PHRASE") {
        const parts = Array.isArray(element.transcriptParts)
          ? element.transcriptParts
          : [];
        const selectableTranscript = parts.filter(
          (item) => item && item.selectable === true,
        );
        const idx =
          typeof element.correctAnswerIndex === "number"
            ? element.correctAnswerIndex
            : element.correctIndex;
        const raw = selectableTranscript[idx] ?? parts[idx] ?? element.correctAnswer;
        const text = extractOptionText(raw);
        if (text) answers.push(text);
      } else if (type === "MATCH") {
        const lists = [
          element.matches,
          element.fallbackHints,
          element.pairs,
        ].filter(Array.isArray);
        lists.forEach((matchList) => {
          matchList.forEach((m) => {
            const left = Array.isArray(m)
              ? m[0]
              : (m?.phrase ??
                m?.learningToken ??
                m?.fromToken ??
                m?.learningWord ??
                m?.token);
            const right = Array.isArray(m)
              ? m[1]
              : (m?.translation ?? m?.toToken ?? m?.fromWord);
            if (left && right) {
              answers.push([normText(left), normText(right)]);
            }
          });
        });
        if (element.dictionary && typeof element.dictionary === "object") {
          Object.entries(element.dictionary).forEach(([k, v]) => {
            const right = typeof v === "string" ? v : v?.translation;
            if (!right) return;
            if (k.includes(":")) {
              const parts = k.split(":");
              const first = normText(parts[0]);
              const rest = normText(parts.slice(1).join(":"));
              if (rest && !/^\d+$/.test(rest)) {
                answers.push([rest, normText(right)]);
              }
              if (first && !/^\d+$/.test(first)) {
                answers.push([first, normText(right)]);
              }
            } else {
              answers.push([normText(k), normText(right)]);
            }
          });
        }
      } else if (type === "ARRANGE") {
        if (
          Array.isArray(element.phraseOrder) &&
          Array.isArray(element.selectablePhrases)
        ) {
          const tempanswers = element.phraseOrder
            .map((idx) => extractOptionText(element.selectablePhrases[idx]))
            .filter(Boolean);
          if (tempanswers.length > 0) {
            answers.push(tempanswers);
          }
        }
      } else if (type === "GAP_FILL") {
        const list = Array.isArray(element.choices)
          ? element.choices
          : Array.isArray(element.answers)
            ? element.answers
            : [];
        if (Array.isArray(element.correctIndices)) {
          element.correctIndices.forEach((i) => {
            const text = extractOptionText(list[i]);
            if (text) answers.push(text);
          });
        } else {
          const idx =
            typeof element.correctAnswerIndex === "number"
              ? element.correctAnswerIndex
              : element.correctIndex;
          if (typeof idx === "number") {
            const text = extractOptionText(list[idx]);
            if (text) answers.push(text);
          }
        }
      }
    } catch {}
  });

  if (type === "MATCH" && Array.isArray(allElements)) {
    allElements.forEach((element) => {
      try {
        const content = element?.line?.content || element?.content || element;
        if (
          typeof content?.text === "string" &&
          Array.isArray(content?.hintMap) &&
          Array.isArray(content?.hints)
        ) {
          content.hintMap.forEach((h) => {
            if (
              typeof h?.rangeFrom === "number" &&
              typeof h?.rangeTo === "number" &&
              typeof h?.hintIndex === "number"
            ) {
              const phrase = normText(
                content.text.substring(h.rangeFrom, h.rangeTo + 1),
              );
              const rawHint = content.hints[h.hintIndex];
              const translation = normText(
                typeof rawHint === "string" ? rawHint : rawHint?.text,
              );
              if (phrase && translation) {
                answers.push([phrase, translation]);
              }
            }
          });
        }
      } catch {}
    });
  }

  return answers;
}
