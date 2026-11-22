function cLog(title, text, ...extra) {
  console.log(
    `%c Cerolingo · ${title} %c ${text} `,
    "background: #6877fe; color: #e7ecff; padding: 3px 6px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: sans-serif;",
    "background: #a1b2ff; color: #454faa; padding: 3px 6px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: sans-serif;",
    ...extra,
  );
}

cLog("challenges.js", "loaded");

let isSolvingChallenge = false;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isFxEnabled = () => localStorage.getItem("botHighlight") !== "false";

function spawnBotFxOverlay(el, mode = "click") {
  if (!el || !isFxEnabled()) return;

  const now = Date.now();
  const lastAt = Number(el.dataset?.cerolingoFxAt || 0);
  if (now - lastAt < 220) return;
  if (el.dataset) el.dataset.cerolingoFxAt = String(now);

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
  setTimeout(() => overlay.remove(), 300);
}

async function botClick(el) {
  if (!el || el.disabled || el.getAttribute?.("aria-disabled") === "true") {
    return;
  }
  const now = Date.now();
  if (now - Number(el._cerolingoLastBotClickAt || 0) < 180) return;
  el._cerolingoLastBotClickAt = now;

  if (isFxEnabled()) {
    el.classList.add("cerolingo-bot-click");
    spawnBotFxOverlay(el, "click");
    await sleep(45);
  }
  el.click();
  if (isFxEnabled()) {
    requestAnimationFrame(() => {
      if (el.isConnected) el.classList.add("cerolingo-bot-click");
    });
  }
}

function getTokenText(btn) {
  const label = btn.querySelector('[data-test="challenge-tap-token-text"]');
  if (label) return label.innerText.trim();
  return btn.innerText.replace(/[\d\n]/g, "").trim();
}

// Tokens are case/whitespace-normalised so "My house " still matches "my house".
function normToken(text) {
  return String(text ?? "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
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
  if (!el || !value) return;

  if (!isFxEnabled()) {
    setReactInputValue(el, value);
    return;
  }

  const wrap = el.closest("label") || el;
  el.classList.add("cerolingo-bot-typing");
  if (wrap !== el) wrap.classList.add("cerolingo-bot-typing");
  spawnBotFxOverlay(wrap, "typing");
  el.focus();

  const totalSteps = Math.min(value.length, 18);
  const stepSize = Math.max(1, Math.ceil(value.length / totalSteps));

  for (let i = stepSize; i < value.length; i += stepSize) {
    setReactInputValue(el, value.slice(0, i));
    await sleep(14);
  }

  setReactInputValue(el, value);
  spawnBotFxOverlay(wrap, "typing");
  await sleep(40);
}

function getActiveChallengeEl() {
  const all = Array.from(
    document.querySelectorAll('[data-test^="challenge "]'),
  );
  if (all.length === 0) {
    return document.querySelector('[data-test^="challenge"]');
  }
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
      'button[aria-disabled="false"], input:not(:disabled), textarea:not(:disabled), [data-test="challenge-choice"]',
    );
    if (activeControls) return el;
  }

  return all[0];
}

function hasChallengePayload(obj, expectedType) {
  if (!obj || typeof obj !== "object") return false;
  if (expectedType && obj.type && obj.type !== expectedType) return false;

  if (
    (!expectedType ||
      expectedType === "match" ||
      expectedType === "listenMatch" ||
      expectedType === "characterMatch") &&
    Array.isArray(obj.pairs) &&
    obj.pairs.length > 0
  ) {
    return true;
  }
  if (
    (Array.isArray(obj.correctTokens) && obj.correctTokens.length > 0) ||
    (Array.isArray(obj.correctSolutions) && obj.correctSolutions.length > 0) ||
    (typeof obj.bestSolution === "string" && obj.bestSolution.length > 0) ||
    (typeof obj.solutionTranslation === "string" &&
      obj.solutionTranslation.length > 0) ||
    (Array.isArray(obj.displayTokens) && obj.displayTokens.length > 0) ||
    typeof obj.correctIndex === "number" ||
    (Array.isArray(obj.correctIndices) && obj.correctIndices.length > 0) ||
    (obj.type === "listen" &&
      typeof obj.prompt === "string" &&
      obj.prompt.length > 0)
  ) {
    return true;
  }

  return false;
}

function extractFromFiberNode(node, expectedType) {
  if (!node) return null;

  const p = node.memoizedProps;
  if (p) {
    if (p.challenges && typeof p.challengeIndex === "number") {
      const ch = p.challenges[p.challengeIndex];
      if (hasChallengePayload(ch, expectedType)) return ch;
    }
    if (hasChallengePayload(p.challenge, expectedType)) return p.challenge;
    if (hasChallengePayload(p.currentChallenge, expectedType)) {
      return p.currentChallenge;
    }
    if (hasChallengePayload(p, expectedType)) return p;
  }

  let s = node.memoizedState;
  while (s) {
    const ms = s.memoizedState;
    if (ms && typeof ms === "object") {
      if (ms.challenges && typeof ms.challengeIndex === "number") {
        const ch = ms.challenges[ms.challengeIndex];
        if (hasChallengePayload(ch, expectedType)) return ch;
      }
      if (hasChallengePayload(ms.challenge, expectedType)) return ms.challenge;
      if (hasChallengePayload(ms.currentChallenge, expectedType)) {
        return ms.currentChallenge;
      }
      if (hasChallengePayload(ms, expectedType)) return ms;
    }
    s = s.next;
  }

  return null;
}

function findChallengeInTrees(activeEl, expectedType) {
  if (activeEl) {
    const fiberKey = Object.keys(activeEl).find(
      (k) =>
        k.startsWith("__reactFiber$") ||
        k.startsWith("__reactInternalInstance$"),
    );
    if (fiberKey) {
      const startFiber = activeEl[fiberKey];

      let curr = startFiber;
      while (curr) {
        const found = extractFromFiberNode(curr, expectedType);
        if (found) return found;
        curr = curr.return;
      }

      const visited = new Set();
      const subQueue = [startFiber];
      while (subQueue.length > 0) {
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

  while (queue.length > 0) {
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

async function clickNext() {
  const nextBtn = document.querySelector('[data-test="player-next"]');
  if (
    nextBtn &&
    nextBtn.getAttribute("aria-disabled") === "false" &&
    !nextBtn.disabled
  ) {
    await botClick(nextBtn);
    return true;
  }

  const continueBtn = Array.from(document.querySelectorAll("button")).find(
    (btn) => {
      if (btn.disabled || btn.getAttribute("aria-disabled") === "true") {
        return false;
      }
      if (
        btn.closest("#cerolingoModMenu") ||
        btn.closest('[data-test^="challenge"]') ||
        btn.closest('[data-test="word-bank"]')
      ) {
        return false;
      }
      const dt = btn.getAttribute("data-test") || "";
      if (
        dt.includes("challenge") ||
        dt.includes("story") ||
        dt.includes("stories") ||
        dt === "player-skip" ||
        dt === "quit-button"
      ) {
        return false;
      }
      const text = btn.innerText.trim().toLowerCase();
      return text === "continue" || text === "kontynuuj" || text === "dalej";
    },
  );

  if (continueBtn) {
    await botClick(continueBtn);
    return true;
  }

  return false;
}

async function solveAssist(ch, scope) {
  if (!ch) return false;

  const choices = Array.from(
    scope.querySelectorAll('[data-test="challenge-choice"]'),
  );
  if (choices.length === 0) return false;

  if (typeof ch.correctIndex === "number" && choices[ch.correctIndex]) {
    await botClick(choices[ch.correctIndex]);
    return true;
  }

  if (Array.isArray(ch.correctIndices) && ch.correctIndices.length > 0) {
    let clicked = false;
    for (const idx of ch.correctIndices) {
      if (choices[idx]) {
        await botClick(choices[idx]);
        clicked = true;
        await sleep(55);
      }
    }
    if (clicked) return true;
  }

  if (ch.bestSolution || ch.correctSolutions?.length > 0) {
    const target = (ch.bestSolution || ch.correctSolutions[0]).trim();
    const match = choices.find((choice) => {
      const textEl =
        choice.querySelector('[data-test="challenge-judge-text"]') || choice;
      return textEl.innerText.trim() === target;
    });
    if (match) {
      await botClick(match);
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

  // Never read virtual keyboard / umlaut bars (e.g. div._3SM2V containing ↑/↓/ä/ö/ü/ß buttons)
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
  const editables = Array.from(
    scope.querySelectorAll('[contenteditable="true"]'),
  );
  if (editables.length > 0 && Array.isArray(ch?.displayTokens)) {
    const blankText = ch.displayTokens
      .filter((t) => t.isBlank)
      .map((t) => t.text)
      .join("");
    if (blankText) {
      const el = editables[0];
      const wrap = el.closest("label") || el;
      if (isFxEnabled()) {
        el.classList.add("cerolingo-bot-typing");
        if (wrap !== el) wrap.classList.add("cerolingo-bot-typing");
        spawnBotFxOverlay(wrap, "typing");
      }
      el.focus();
      el.innerText = blankText;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  const inputs = Array.from(
    scope.querySelectorAll('input[data-test="challenge-text-input"]'),
  );
  if (inputs.length === 0) return false;

  let filled = false;

  if (ch) {
    if (Array.isArray(ch.displayTokens)) {
      const blankTokens = ch.displayTokens.filter((t) => t.isBlank);
      for (let idx = 0; idx < inputs.length; idx++) {
        if (blankTokens[idx]?.text) {
          await typewriteReactInput(inputs[idx], blankTokens[idx].text);
          filled = true;
        }
      }
    }

    if (!filled) {
      const solution =
        ch.bestSolution ||
        (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
        ch.solutionTranslation ||
        (Array.isArray(ch.correctTokens) && ch.correctTokens.join(" "));

      if (solution) {
        await typewriteReactInput(inputs[0], solution);
        filled = true;
      }
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
  if (!ch || (ch.type !== "listen" && ch.type !== "listenTap")) return false;

  const textarea = scope.querySelector(
    'textarea[data-test="challenge-translate-input"], input[data-test="challenge-text-input"]',
  );
  if (textarea) {
    const solution =
      ch.prompt ||
      ch.bestSolution ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
      (Array.isArray(ch.correctTokens) && ch.correctTokens.join(" "));

    if (solution) {
      await typewriteReactInput(textarea, solution);
      return true;
    }
  }

  if (Array.isArray(ch.correctTokens)) {
    const bank = scope.querySelector('[data-test="word-bank"]');
    if (bank) {
      for (const token of ch.correctTokens) {
        const btns = Array.from(
          bank.querySelectorAll(
            '[data-test*="-challenge-tap-token"][aria-disabled="false"], button[aria-disabled="false"]',
          ),
        );
        const target = btns.find((b) => getTokenText(b) === token);
        if (target) {
          await botClick(target);
          await sleep(55);
        }
      }
      return true;
    }
  }

  return false;
}

async function solvePatternTapComplete(ch, scope) {
  if (
    !ch ||
    (ch.type !== "patternTapComplete" &&
      ch.type !== "tapCloze" &&
      ch.type !== "tapComplete")
  ) {
    return false;
  }

  const bank = scope.querySelector('[data-test="word-bank"]');
  const btns = bank
    ? Array.from(bank.querySelectorAll('button[aria-disabled="false"]'))
    : Array.from(
        scope.querySelectorAll(
          'button[data-test*="-challenge-tap-token"][aria-disabled="false"]',
        ),
      );
  if (btns.length === 0) return false;

  if (typeof ch.correctIndex === "number" && btns[ch.correctIndex]) {
    await botClick(btns[ch.correctIndex]);
    return true;
  }

  if (Array.isArray(ch.correctIndices)) {
    for (const idx of ch.correctIndices) {
      if (btns[idx]) {
        await botClick(btns[idx]);
        await sleep(65);
      }
    }
    return true;
  }

  const tokens =
    ch.correctTokens ||
    ch.correctSolutions ||
    (ch.bestSolution ? [ch.bestSolution] : null) ||
    (ch.choices && typeof ch.correctIndex === "number"
      ? [ch.choices[ch.correctIndex]]
      : null);

  if (tokens) {
    for (const t of tokens) {
      const text = typeof t === "string" ? t : t?.text;
      const match = btns.find((b) => getTokenText(b) === text);
      if (match) {
        await botClick(match);
        await sleep(65);
      }
    }
    return true;
  }

  return false;
}

async function solveTranslate(ch, scope) {
  if (!ch) return false;

  if (Array.isArray(ch.correctTokens)) {
    const bank = scope.querySelector('[data-test="word-bank"]');
    if (bank) {
      for (const token of ch.correctTokens) {
        const btns = Array.from(
          bank.querySelectorAll('button[aria-disabled="false"]'),
        );
        const match = btns.find((b) => getTokenText(b) === token);
        if (match) {
          await botClick(match);
          await sleep(65);
        }
      }
      return true;
    }
  }

  if (ch.correctSolutions || ch.bestSolution || ch.solutionTranslation) {
    const solution =
      ch.bestSolution ||
      (Array.isArray(ch.correctSolutions) && ch.correctSolutions[0]) ||
      ch.solutionTranslation;
    const input = scope.querySelector(
      'textarea[data-test="challenge-translate-input"], input[data-test="challenge-text-input"]',
    );
    if (input && solution) {
      await typewriteReactInput(input, solution);
      return true;
    }
  }

  return false;
}

async function solveListenMatch(scope) {
  if (scope.querySelector('[data-test="word-bank"]')) return false;

  const allButtons = Array.from(
    scope.querySelectorAll(
      'button[data-test*="-challenge-tap-token"][aria-disabled="false"]',
    ),
  );
  if (allButtons.length === 0) return false;

  const groups = new Map();
  for (const btn of allButtons) {
    const dt = btn.getAttribute("data-test");
    if (!groups.has(dt)) groups.set(dt, []);
    groups.get(dt).push(btn);
  }

  let matched = false;
  for (const pairBtns of groups.values()) {
    if (pairBtns.length === 2) {
      matched = true;
      await botClick(pairBtns[0]);
      await sleep(80);
      await botClick(pairBtns[1]);
      await sleep(100);
    }
  }

  return matched;
}

async function solveMatch(ch, scope) {
  if (scope.querySelector('[data-test="word-bank"]')) return false;
  if (!ch || !Array.isArray(ch.pairs)) return false;

  let matched = false;
  for (const pair of ch.pairs) {
    const words = [
      pair.learningToken,
      pair.fromToken,
      pair.learningWord,
      pair.fromWord,
      pair.translation,
      pair.token,
    ].filter(Boolean);

    if (words.length < 2) continue;

    // Multi-word tokens get data-test values such as "house-challenge-tap-token my",
    // so match on the substring and compare the visible token text instead.
    const available = Array.from(
      scope.querySelectorAll(
        'button[data-test*="-challenge-tap-token"][aria-disabled="false"]',
      ),
    );

    const findBtn = (text, exclude) => {
      const want = normToken(text);
      return available.find(
        (b) =>
          b !== exclude &&
          (normToken(getTokenText(b)) === want ||
            normToken(b.getAttribute("data-test")) ===
              `${want}-challenge-tap-token`),
      );
    };

    // Pick the first two words that resolve to two different buttons
    // (learningToken and learningWord can be the same text).
    let btn1 = null;
    let btn2 = null;
    for (const word of words) {
      if (!btn1) btn1 = findBtn(word);
      else if (!btn2) btn2 = findBtn(word, btn1);
    }

    if (btn1 && btn2) {
      matched = true;
      await botClick(btn1);
      await sleep(80);
      await botClick(btn2);
      await sleep(100);
    }
  }

  return matched;
}

function isStoryLessonPage(href) {
  if (href.includes("/story") || href.includes("/stories")) return true;
  return Boolean(
    document.querySelector(
      '[data-test="stories-element"], button[data-test="story-start"], button[data-test="stories-player-continue"], button[data-test="stories-player-done"], button[data-test="stories-choice"], img[src*="stories-cdn.duolingo.com"]',
    ),
  );
}

async function handleChallengeStep() {
  if (localStorage.getItem("autoSolver") === "false") return;

  const href = window.location.href;
  if (isSolvingChallenge || !href.includes("/lesson")) {
    return;
  }

  if (isStoryLessonPage(href)) {
    return;
  }

  if (await clickNext()) return;

  isSolvingChallenge = true;
  try {
    const activeEl = getActiveChallengeEl();
    const scope = activeEl || document;
    const ch = getChallenge(activeEl);
    let solved = false;

    if (await solveListenMatch(scope)) {
      solved = true;
    } else if (await solveMatch(ch, scope)) {
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
    }

    if (solved) {
      await sleep(160);
      await clickNext();
    }
  } finally {
    isSolvingChallenge = false;
  }
}

setInterval(handleChallengeStep, 200);
