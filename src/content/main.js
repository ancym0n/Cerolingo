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

function run() {
  if (!document.getElementById("CEROLINGO") && document.body) {
    const cerolingo = document.createElement("div");
    cerolingo.id = "CEROLINGO";
    document.body.appendChild(cerolingo);
  }

  storyBotStarted = false;
  lastSavedStoryId = null;

  const href = window.location.href;
  if (href.includes("/lesson") || href.includes("/stories")) {
    chrome.storage.local.set({
      url: href,
      isStoryUrl: href.includes("/story") || href.includes("/stories"),
    });
  }

  if (jsonInterval) clearInterval(jsonInterval);

  jsonInterval = setInterval(() => {
    const currentHref = window.location.href;
    const isStoryRoute =
      currentHref.includes("/story") || currentHref.includes("/stories");
    const hasStoryDom = isStoryDomPresent();

    if (!isStoryRoute && !hasStoryDom) {
      return;
    }

    const lessonJsonURL = findStoryJsonUrl();
    if (lessonJsonURL) {
      const linkToSave = lessonJsonURL.split("?")[0];
      if (linkToSave !== lastSavedStoryId) {
        lastSavedStoryId = linkToSave;
        chrome.storage.local.set(
          { storyId: linkToSave, url: currentHref, isStoryUrl: true },
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
  const inLesson =
    href.includes("/lesson") ||
    href.includes("/stories") ||
    href.includes("/story");

  if (inLesson) {
    wasInLesson = true;
    if (document.getElementById("CEROLINGO") === null) {
      run();
    }
  } else {
    if (wasInLesson) {
      wasInLesson = false;
      storyBotStarted = false;
      if (jsonInterval) {
        clearInterval(jsonInterval);
        jsonInterval = null;
      }
      document.getElementById("CEROLINGO")?.remove();
      if (typeof stopStorySolver === "function") {
        stopStorySolver();
      }
    }

    chrome.storage.local.get(["url", "loop", "isStoryUrl"], (data) => {
      if (data.url && data.url.includes("/lesson") && data.loop === true) {
        window.location.href = data.isStoryUrl
          ? data.url.replace("level", "legendary")
          : data.url;
      }
    });
  }
}, 500);
