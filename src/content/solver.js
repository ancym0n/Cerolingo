loadedLog("solver");

let storyStartInterval = null;
let contClickerInterval = null;

function stopStorySolver() {
  if (storyStartInterval) {
    clearInterval(storyStartInterval);
    storyStartInterval = null;
  }
  if (contClickerInterval) {
    clearInterval(contClickerInterval);
    contClickerInterval = null;
  }
}

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

function getStoryTokenText(btn) {
  if (!btn) return "";
  const label = btn.querySelector('[data-test="challenge-tap-token-text"]');
  if (label) {
    return normText(label.textContent || label.innerText);
  }
  const raw = btn.innerText || btn.textContent || "";
  const strippedLeadingNum = normText(raw.replace(/^\s*\d+[\s.\r\n)-]*/, ""));
  if (strippedLeadingNum) return strippedLeadingNum;
  return normText(raw.replace(/[\d\r\n]/g, ""));
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
  add(rawInner.replace(/^\s*\d+[\s.\r\n)-]*/, ""));
  add(rawInner.replace(/[\d\r\n]/g, ""));
  add(rawText.replace(/^\s*\d+[\s.\r\n)-]*/, ""));
  add(rawText.replace(/[\d\r\n]/g, ""));

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

function getTapTokenElements() {
  const raw = Array.from(
    document.querySelectorAll('[data-test*="challenge-tap-token"]'),
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
  return true;
}

function spawnStoryFxOverlay(el) {
  if (!el || localStorage.getItem("botHighlight") === "false") return;
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
  overlay.className = "cerolingo-fx-overlay cerolingo-fx-click";
  overlay.style.left = `${rect.left - 2}px`;
  overlay.style.top = `${rect.top - 2}px`;
  overlay.style.width = `${rect.width + 4}px`;
  overlay.style.height = `${rect.height + 4}px`;
  overlay.style.borderRadius = radius;

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 300);
}

function storyClick(el) {
  if (!el) return;
  if (localStorage.getItem("botHighlight") !== "false") {
    el.classList.add("cerolingo-bot-click");
    spawnStoryFxOverlay(el);
  }
  el.click();
}

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
    await new Promise((r) => setTimeout(r, 80));
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
  };
}

async function autoAnswerBot(url) {
  stopStorySolver();

  let answerMP = [];
  let answerSP = [];
  let answerPTP = [];
  let answerA = [];
  let answerM = [];
  let answerGF = [];
  let lastCachedAttr = null;

  const applyData = (data) => {
    if (!data || !Array.isArray(data.elements)) return;
    const sets = buildAnswerSets(data);
    answerMP = [...sets.answerMP, ...answerMP];
    answerSP = [...sets.answerSP, ...answerSP];
    answerPTP = [...sets.answerPTP, ...answerPTP];
    answerA = [...sets.answerA, ...answerA];
    answerM = [...sets.answerM, ...answerM];
    answerGF = [...sets.answerGF, ...answerGF];
  };

  storyStartInterval = setInterval(() => {
    if (localStorage.getItem("autoSolver") === "false") return;
    const storyStartButton = document.querySelector(
      'button[data-test="story-start"]',
    );
    if (
      storyStartButton &&
      !storyStartButton.disabled &&
      storyStartButton.getAttribute("aria-disabled") !== "true"
    ) {
      storyClick(storyStartButton);
      clearInterval(storyStartInterval);
      storyStartInterval = null;
    }
  }, 100);

  setTimeout(() => {
    if (storyStartInterval) {
      clearInterval(storyStartInterval);
      storyStartInterval = null;
    }
  }, 10000);

  contClickerInterval = setInterval(() => {
    if (localStorage.getItem("autoSolver") === "false") return;

    const currentCachedAttr = document.documentElement?.getAttribute(
      "data-cerolingo-story-json",
    );
    if (currentCachedAttr && currentCachedAttr !== lastCachedAttr) {
      lastCachedAttr = currentCachedAttr;
      const parsed = readCachedStoryData();
      if (parsed) applyData(parsed);
    }

    const continueButton = document.querySelector(
      'button[data-test="stories-player-continue"]',
    );
    const isContinueReady =
      continueButton &&
      !continueButton.disabled &&
      continueButton.getAttribute("aria-disabled") !== "true";

    if (isContinueReady) {
      storyClick(continueButton);
      return;
    }

    const now = Date.now();
    const allChoiceButtons = Array.from(
      document.querySelectorAll('button[data-test="stories-choice"]'),
    ).filter(
      (btn) => !btn.disabled && btn.getAttribute("aria-disabled") !== "true",
    );
    const visibleChoices = allChoiceButtons.filter(isElementActiveInStory);
    const choiceAnswers = [...answerSP, ...answerMP, ...answerGF];

    const tryClickChoices = (choiceList) => {
      let clicked = false;
      choiceList.forEach((btn) => {
        if (now - (btn._cerolingoChoiceClickedAt || 0) < 350) return;

        const rawBtn = btn.innerText || btn.textContent || "";
        const btnText = normText(rawBtn);
        const strippedText = normText(rawBtn.replace(/^[\d\s.()-]+/, ""));
        const siblingText = normText(
          btn.nextElementSibling?.innerText ||
            btn.nextElementSibling?.textContent,
        );
        const parentRaw =
          btn.parentElement?.innerText || btn.parentElement?.textContent || "";
        const parentText = normText(parentRaw);
        const parentStripped = normText(parentRaw.replace(/^[\d\s.()-]+/, ""));

        const candidates = [
          btnText,
          strippedText,
          siblingText,
          parentText,
          parentStripped,
        ].filter(Boolean);

        const matched = candidates.some((cand) =>
          choiceAnswers.some((ans) => isStoryTokenEqual(cand, ans)),
        );

        if (matched) {
          btn._cerolingoChoiceClickedAt = now;
          clicked = true;
          storyClick(btn);
        }
      });
      return clicked;
    };

    let clickedChoice = tryClickChoices(visibleChoices);
    let handledTap = false;

    if (!clickedChoice) {
      const allDomTapButtons = getTapTokenElements();
      const allTapButtons = allDomTapButtons.filter(
        (btn) => !btn.disabled && btn.getAttribute("aria-disabled") !== "true",
      );
      const visibleTapButtons = allTapButtons.filter(isElementActiveInStory);
      const challengeButtons =
        visibleTapButtons.length > 0 ? visibleTapButtons : allTapButtons;

      if (challengeButtons.length > 0) {
        const tryGapFill = () => {
          const wordBank = document.querySelector('[data-test="word-bank"]');
          if (!wordBank || answerGF.length === 0) return false;
          let clicked = false;
          answerGF.forEach((ans) => {
            challengeButtons.forEach((btn) => {
              if (now - (btn._cerolingoTapClickedAt || 0) < 350) return;
              if (doesButtonMatchStoryAnswer(btn, ans)) {
                btn._cerolingoTapClickedAt = now;
                clicked = true;
                storyClick(btn);
              }
            });
          });
          return clicked;
        };

        const tryArrange = () => {
          if (answerA.length === 0) return false;
          let clicked = false;
          for (const ansA of answerA) {
            if (!Array.isArray(ansA) || ansA.length === 0) continue;
            const isCurrentArrange =
              ansA.every((a) =>
                allDomTapButtons.some((cbtn) =>
                  doesButtonMatchStoryAnswer(cbtn, a),
                ),
              ) &&
              allDomTapButtons.every((cbtn) =>
                ansA.some((a) => doesButtonMatchStoryAnswer(cbtn, a)),
              );

            if (isCurrentArrange) {
              const used = new Set();
              ansA.forEach((a) => {
                const targetBtn = challengeButtons.find(
                  (cbtn) =>
                    !used.has(cbtn) &&
                    now - (cbtn._cerolingoTapClickedAt || 0) >= 350 &&
                    doesButtonMatchStoryAnswer(cbtn, a),
                );
                if (targetBtn) {
                  used.add(targetBtn);
                  targetBtn._cerolingoTapClickedAt = now;
                  clicked = true;
                  storyClick(targetBtn);
                }
              });
              if (clicked) break;
            }
          }
          return clicked;
        };

        const tryPointToPhrase = () => {
          if (answerPTP.length === 0) return false;
          let clicked = false;
          challengeButtons.forEach((btn) => {
            if (now - (btn._cerolingoTapClickedAt || 0) < 350) return;
            if (answerPTP.some((ans) => doesButtonMatchStoryAnswer(btn, ans))) {
              btn._cerolingoTapClickedAt = now;
              clicked = true;
              storyClick(btn);
            }
          });
          return clicked;
        };

        const tryMatch = () => {
          if (answerM.length === 0 || challengeButtons.length < 2) return false;
          const available = challengeButtons.filter(
            (btn) => now - (btn._cerolingoMatchedAt || 0) >= 500,
          );
          const pool = available.length >= 2 ? available : challengeButtons;
          for (const match of answerM) {
            const btn1 = pool.find((btn) =>
              doesButtonMatchStoryAnswer(btn, match[0]),
            );
            const btn2 = pool.find(
              (btn) =>
                btn !== btn1 && doesButtonMatchStoryAnswer(btn, match[1]),
            );
            if (btn1 && btn2) {
              btn1._cerolingoMatchedAt = now;
              btn2._cerolingoMatchedAt = now;
              storyClick(btn1);
              storyClick(btn2);
              return true;
            }
          }
          return false;
        };

        const isListLayout = challengeButtons.some((btn) =>
          Boolean(btn.closest("ul, li")),
        );

        if (isListLayout) {
          handledTap =
            tryMatch() || tryGapFill() || tryArrange() || tryPointToPhrase();
        } else {
          handledTap =
            tryGapFill() || tryArrange() || tryPointToPhrase() || tryMatch();
        }
      }
    }

    if (
      !clickedChoice &&
      !handledTap &&
      visibleChoices.length === 0 &&
      allChoiceButtons.length > 0
    ) {
      tryClickChoices(allChoiceButtons);
    }

    const endButton = document.querySelector(
      'button[data-test="stories-player-done"]',
    );
    if (
      endButton &&
      !endButton.disabled &&
      endButton.getAttribute("aria-disabled") !== "true"
    ) {
      clearInterval(contClickerInterval);
      contClickerInterval = null;
      storyClick(endButton);
    }
  }, 100);

  try {
    const data = await fetchStoryData(url);
    applyData(data);
    return data;
  } catch (error) {
    cerolingoLog("solver", "Error fetching story JSON", error);
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
          const raw = list[idx];
          const text = typeof raw === "string" ? raw : raw?.text;
          if (text) answers.push(normText(text));
        }
        if (Array.isArray(element.correctIndices)) {
          element.correctIndices.forEach((i) => {
            const raw = list[i];
            const text = typeof raw === "string" ? raw : raw?.text;
            if (text) answers.push(normText(text));
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
        const raw = selectableTranscript[idx] ?? parts[idx];
        const text = typeof raw === "string" ? raw : raw?.text;
        if (text) answers.push(normText(text));
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
            .map((idx) => {
              const raw = element.selectablePhrases[idx];
              return normText(typeof raw === "string" ? raw : raw?.text);
            })
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
            const raw = list[i];
            const text = typeof raw === "string" ? raw : raw?.text;
            if (text) answers.push(normText(text));
          });
        } else {
          const idx =
            typeof element.correctAnswerIndex === "number"
              ? element.correctAnswerIndex
              : element.correctIndex;
          if (typeof idx === "number") {
            const raw = list[idx];
            const text = typeof raw === "string" ? raw : raw?.text;
            if (text) answers.push(normText(text));
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
