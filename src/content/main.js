const defaultSettings = [
  "audioBlock",
  "storyHighlight",
  "legendaryBypass",
  "autoSolver",
  "botHighlight",
];

performance.setResourceTimingBufferSize?.(5000);

chrome.storage.local.get(defaultSettings, (data) => {
  defaultSettings.forEach((key) => {
    if (data[key] === undefined) {
      if (
        key === "audioBlock" ||
        key === "autoSolver" ||
        key === "botHighlight"
      ) {
        localStorage.setItem(key, "true");
      }
      chrome.storage.local.set({ [key]: true });
    } else if (
      key === "audioBlock" ||
      key === "autoSolver" ||
      key === "botHighlight"
    ) {
      localStorage.setItem(key, data[key].toString());
    }
  });
});

function cerolingoLog(tag, message, ...extra) {
  console.log(
    `%c Cerolingo · ${tag} %c ${message} `,
    "background: #6877fe; color: #e7ecff; padding: 3px 6px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: sans-serif;",
    "background: #a1b2ff; color: #454faa; padding: 3px 6px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: sans-serif;",
    ...extra,
  );
}

function loadedLog(filename) {
  cerolingoLog(`${filename}.js`, "loaded");
}

loadedLog("main");

let wasInLesson = false;
let jsonInterval = null;
let storyBotStarted = false;
let lastSavedStoryId = null;

const ACTION_GUARD_STORAGE_KEY = "cerolingoActionGuard";
const ACTION_GUARD_WINDOW_MS = 12000;
const ACTION_GUARD_MAX_NAVIGATIONS = 3;
const ACTION_GUARD_COOLDOWN_MS = 3500;
const ACTION_GUARD_PROMO_COOLDOWN_MS = 1800;
const AUTO_PATH_LEARN_SETTLE_MS = 1800;

let lastRedirectAttemptAt = 0;
let learnEnteredAt = window.location.pathname.startsWith("/learn")
  ? Date.now()
  : 0;

function readActionGuardState() {
  try {
    const raw = sessionStorage.getItem(ACTION_GUARD_STORAGE_KEY);
    if (!raw) return { timestamps: [], trippedAt: 0 };
    const parsed = JSON.parse(raw);
    return {
      timestamps: Array.isArray(parsed?.timestamps)
        ? parsed.timestamps.filter((t) => typeof t === "number")
        : [],
      trippedAt: typeof parsed?.trippedAt === "number" ? parsed.trippedAt : 0,
    };
  } catch {
    return { timestamps: [], trippedAt: 0 };
  }
}

function writeActionGuardState(state) {
  try {
    sessionStorage.setItem(ACTION_GUARD_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function resetActionGuardState() {
  writeActionGuardState({ timestamps: [], trippedAt: 0 });
}

function isLessonUrl(href) {
  if (!href || typeof href !== "string") return false;
  let pathname = "";
  try {
    pathname = new URL(href, window.location.origin).pathname;
  } catch {
    pathname = href;
  }
  return (
    pathname.includes("/lesson") ||
    pathname.includes("/stories") ||
    pathname.includes("/story") ||
    pathname === "/practice" ||
    pathname.startsWith("/practice/") ||
    pathname.includes("/mistakes-review") ||
    pathname.includes("/skill/") ||
    pathname.includes("/alphabets")
  );
}

function canExecuteNavigationAction(targetUrl) {
  if (!targetUrl || typeof targetUrl !== "string") return false;

  let parsedTarget;
  try {
    parsedTarget = new URL(targetUrl, window.location.origin);
  } catch {
    return false;
  }

  if (parsedTarget.origin !== window.location.origin) return false;
  if (!isLessonUrl(parsedTarget.href)) {
    return false;
  }

  if (parsedTarget.href === window.location.href) return false;

  const now = Date.now();
  if (now - lastRedirectAttemptAt < ACTION_GUARD_COOLDOWN_MS) {
    return false;
  }

  const state = readActionGuardState();
  const recent = state.timestamps.filter(
    (ts) => now - ts < ACTION_GUARD_WINDOW_MS,
  );

  if (recent.length >= ACTION_GUARD_MAX_NAVIGATIONS) {
    writeActionGuardState({ timestamps: recent, trippedAt: now });
    chrome.storage.local.set({ loop: false, autoPath: false }, () => {
      cerolingoLog(
        "guard",
        "Navigation rate limit exceeded: Lesson Loop / Auto-Path auto-disabled to prevent refresh loop",
      );
    });
    return false;
  }

  lastRedirectAttemptAt = now;
  recent.push(now);
  writeActionGuardState({ timestamps: recent, trippedAt: 0 });
  return true;
}

function canClickActionTarget(
  el,
  cooldownMs = ACTION_GUARD_PROMO_COOLDOWN_MS,
  ignoreVisibility = false,
) {
  if (
    !el ||
    el.disabled ||
    el.getAttribute?.("aria-disabled") === "true" ||
    el.tagName === "A"
  ) {
    return false;
  }
  const now = Date.now();
  const lastClicked = Number(el._cerolingoActionAt || 0);
  if (now - lastClicked < cooldownMs) return false;

  if (!ignoreVisibility) {
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
    if (rect.width <= 0 || rect.height <= 0) return false;
  }

  el._cerolingoActionAt = now;
  return true;
}

const STORY_DOM_SELECTOR =
  '[data-test="stories-element"], button[data-test="story-start"], button[data-test="stories-player-continue"], button[data-test="stories-player-done"], button[data-test="stories-choice"], img[src*="stories-cdn.duolingo.com"]';

function isStoryDomPresent() {
  return Boolean(document.querySelector(STORY_DOM_SELECTOR));
}

function findStoryJsonUrl() {
  const jsons = performance
    .getEntriesByType("resource")
    .filter(
      (resource) =>
        (resource.name.startsWith("https://stories.duolingo.") ||
          resource.name.startsWith("https://stories-edge.duolingo.") ||
          resource.name.includes("/api2/stories/")) &&
        !resource.name.includes("/complete"),
    )
    .map((resource) => resource.name);

  if (jsons.length > 0) {
    return jsons[jsons.length - 1];
  }

  return (
    document.documentElement?.getAttribute("data-cerolingo-story-url") || null
  );
}

const OVERLAY_DISMISS_DATA_TESTS = [
  "#onetrust-accept-btn-handler",
  '[data-test="plus-no-thanks"]',
  '[data-test="notification-drawer-no-thanks-button"]',
  '[data-test="practice-reminder-no-thanks"]',
  '[data-test="streak-freeze-no-thanks"]',
];

const OVERLAY_DISMISS_TEXTS = new Set([
  "continue in browser",
  "kontynuuj w przeglądarce",
  "weiter im browser",
  "no thanks",
  "nie, dziękuję",
  "nein danke",
  "no, gracias",
  "non merci",
  "maybe later",
  "może później",
  "not now",
  "nie teraz",
  "i'll do it later",
  "got it",
  "claim",
  "claim xp",
  "continue",
  "kontynuuj",
  "dalej",
  "weiter",
]);

function dismissMobileAppPromo(allowGeneralOverlays = false) {
  const overlays = document.getElementById("overlays");

  // Dismiss mobile app promo
  if (overlays) {
    const appLink = overlays.querySelector(
      'a[href*="mobile_web_to_app_conversion"], a[href*="adj.st"]',
    );
    const promoImg = overlays.querySelector(
      'img[src*="617c9bcf01673a55c983c7d0a14a6bd4.svg"]',
    );
    const container =
      appLink?.closest("#overlays > div") ||
      promoImg?.closest("#overlays > div") ||
      appLink?.parentElement ||
      promoImg?.parentElement ||
      null;

    if (container) {
      const continueBtn = container.querySelector("button");
      if (canClickActionTarget(continueBtn, ACTION_GUARD_PROMO_COOLDOWN_MS, true)) {
        continueBtn.click();
        return true;
      }
    }

    const buttons = overlays.querySelectorAll("button");
    for (const btn of buttons) {
      const text = (btn.innerText || btn.textContent || "").trim().toLowerCase();
      if (
        text === "continue in browser" ||
        text === "kontynuuj w przeglądarce" ||
        text === "weiter im browser"
      ) {
        if (canClickActionTarget(btn, ACTION_GUARD_PROMO_COOLDOWN_MS, true)) {
          btn.click();
          return true;
        }
        return false;
      }
    }
  }

  if (!allowGeneralOverlays || localStorage.getItem("autoSolver") === "false") {
    return false;
  }

  // Dismiss promo / interstitial / cookie banners
  for (const sel of OVERLAY_DISMISS_DATA_TESTS) {
    const btn = document.querySelector(sel);
    if (canClickActionTarget(btn)) {
      btn.click();
      return true;
    }
  }

  // Dismiss blocking modals inside #overlays
  if (overlays) {
    const overlayButtons = overlays.querySelectorAll("button");
    for (const btn of overlayButtons) {
      if (btn.closest("#cerolingoModMenu")) continue;
      const dt = btn.getAttribute("data-test") || "";
      if (
        dt === "quit-button" ||
        dt === "purchase-button" ||
        dt === "plus-offer-button"
      ) {
        continue;
      }
      const text = (btn.innerText || btn.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      if (OVERLAY_DISMISS_TEXTS.has(text)) {
        if (canClickActionTarget(btn)) {
          btn.click();
          return true;
        }
      }
    }
  }

  return false;
}

function shouldAutoDismissOverlays(isAutomatedLoop = false) {
  const path = window.location.pathname;
  if (isAutomatedLoop) return true;
  if (path.startsWith("/shop") || path.startsWith("/practice-hub")) {
    return false;
  }
  return path.startsWith("/learn") || isLessonUrl(window.location.href);
}

let promoDismissScheduled = false;
const overlayObserver = new MutationObserver(() => {
  if (promoDismissScheduled) return;
  promoDismissScheduled = true;
  requestAnimationFrame(() => {
    promoDismissScheduled = false;
    dismissMobileAppPromo(shouldAutoDismissOverlays(false));
  });
});

if (document.documentElement) {
  overlayObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function tryOpenPathChest() {
  const candidates = document.querySelectorAll(
    'button[aria-label="Chest"]:not(:disabled), button[aria-label="Open chest"]:not(:disabled), button[aria-label*="chest" i]:not(:disabled), button[aria-label*="skrzyn" i]:not(:disabled), button[aria-label*="truhe" i]:not(:disabled), button[aria-label*="cofre" i]:not(:disabled), button[aria-label*="coffre" i]:not(:disabled)',
  );
  for (const chestBtn of candidates) {
    if (chestBtn.closest("#cerolingoModMenu")) continue;
    if (canClickActionTarget(chestBtn, 2200)) {
      chestBtn.click();
      cerolingoLog("path", "Opened path treasure chest");
      return true;
    }
  }
  return false;
}

function run() {
  if (!document.getElementById("CEROLINGO") && document.body) {
    const cerolingo = document.createElement("div");
    cerolingo.id = "CEROLINGO";
    document.body.appendChild(cerolingo);
  }

  storyBotStarted = false;
  lastSavedStoryId = null;

  const href = window.location.href;
  const isStoryRoute = href.includes("/story") || href.includes("/stories");
  if (isLessonUrl(href)) {
    chrome.storage.local.set({
      url: href,
      isStoryUrl: isStoryRoute,
    });
  }

  if (jsonInterval) clearInterval(jsonInterval);

  jsonInterval = setInterval(() => {
    const currentHref = window.location.href;
    const onStoryRoute =
      currentHref.includes("/story") || currentHref.includes("/stories");
    const hasStoryDom = isStoryDomPresent();

    if (!onStoryRoute && !hasStoryDom) {
      return;
    }

    const lessonJsonURL = findStoryJsonUrl();
    if (lessonJsonURL) {
      const linkToSave = lessonJsonURL.split("?")[0];
      if (linkToSave !== lastSavedStoryId) {
        lastSavedStoryId = linkToSave;
        chrome.storage.local.set(
          {
            storyId: linkToSave,
            url: currentHref,
            isStoryUrl: onStoryRoute || hasStoryDom,
          },
          () => {
            cerolingoLog("main", "Story ID saved to storage", linkToSave);
          },
        );
      }
    }

    if (!storyBotStarted) {
      storyBotStarted = true;
      autoAnswerBot(lessonJsonURL);
    }
  }, 150);
}

setInterval(() => {
  const href = window.location.href;
  const inLesson = isLessonUrl(href);

  if (inLesson) {
    learnEnteredAt = 0;
    dismissMobileAppPromo(shouldAutoDismissOverlays(false));
    wasInLesson = true;
    if (document.getElementById("CEROLINGO") === null) {
      run();
    }
  } else {
    if (wasInLesson) {
      wasInLesson = false;
      learnEnteredAt = window.location.pathname.startsWith("/learn")
        ? Date.now()
        : 0;
      storyBotStarted = false;
      if (jsonInterval) {
        clearInterval(jsonInterval);
        jsonInterval = null;
      }
      document.getElementById("CEROLINGO")?.remove();
      if (typeof stopStorySolver === "function") {
        stopStorySolver();
      }
    } else if (window.location.pathname.startsWith("/learn")) {
      if (!learnEnteredAt) learnEnteredAt = Date.now();
    } else {
      learnEnteredAt = 0;
    }

    chrome.storage.local.get(
      ["url", "loop", "autoPath", "isStoryUrl"],
      (data) => {
        const automated = data.loop === true || data.autoPath === true;
        const dismissed = dismissMobileAppPromo(
          shouldAutoDismissOverlays(automated),
        );
        if (dismissed) {
          if (learnEnteredAt) learnEnteredAt = Date.now();
          return;
        }

        if (data.autoPath === true) {
          if (localStorage.getItem("autoSolver") === "false") return;
          if (!window.location.pathname.startsWith("/learn")) return;
          if (tryOpenPathChest()) {
            learnEnteredAt = Date.now();
            return;
          }
          if (
            learnEnteredAt &&
            Date.now() - learnEnteredAt < AUTO_PATH_LEARN_SETTLE_MS
          ) {
            return;
          }
          const nextUrl = `${window.location.origin}/lesson`;
          if (canExecuteNavigationAction(nextUrl)) {
            window.location.href = nextUrl;
          }
          return;
        }

        if (
          data.loop === true &&
          typeof data.url === "string" &&
          isLessonUrl(data.url)
        ) {
          const targetUrl =
            data.isStoryUrl && data.url.includes("/level")
              ? data.url.replace("/level", "/legendary")
              : data.url;
          if (canExecuteNavigationAction(targetUrl)) {
            window.location.href = targetUrl;
          }
        }
      },
    );
  }
}, 500);
