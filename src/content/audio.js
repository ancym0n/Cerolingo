function cLog(title, text, ...extra) {
  console.log(
    `%c Cerolingo · ${title} %c ${text} `,
    "background: #6877fe; color: #e7ecff; padding: 3px 6px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: sans-serif;",
    "background: #a1b2ff; color: #454faa; padding: 3px 6px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: sans-serif;",
    ...extra,
  );
}

cLog("audio.js", "loaded");

performance.setResourceTimingBufferSize?.(5000);

window.HTMLAudioElement.prototype.play = function () {
  if (localStorage.getItem("audioBlock") !== "false") {
    cLog("bypass", "HTML5 Audio auto-blocked");
    return;
  }
};

if (window.AudioContext) {
  window.AudioContext.prototype.resume = function () {
    if (localStorage.getItem("audioBlock") !== "false") {
      cLog("bypass", "AudioContext auto-blocked");
      return;
    }
  };
}

function isStoryApiUrl(url) {
  return (
    typeof url === "string" &&
    (url.startsWith("https://stories.duolingo.") ||
      url.startsWith("https://stories-edge.duolingo.") ||
      url.includes("/api2/stories/")) &&
    !url.includes("/complete")
  );
}

function isStoryObj(obj) {
  return Boolean(
    obj &&
      typeof obj === "object" &&
      Array.isArray(obj.elements) &&
      obj.elements.length > 0 &&
      obj.elements.some((el) => el && typeof el.type === "string"),
  );
}

function findStoryInObject(obj, depth = 3, seen = new Set()) {
  if (!obj || typeof obj !== "object" || seen.has(obj)) return null;
  if (isStoryObj(obj)) return obj;
  if (depth <= 0 || obj instanceof Node || obj instanceof Window) return null;
  seen.add(obj);

  const directKeys = ["story", "storyData", "currentStory", "data", "value"];
  for (const k of directKeys) {
    if (obj[k] && typeof obj[k] === "object") {
      const found = findStoryInObject(obj[k], depth - 1, seen);
      if (found) return found;
    }
  }

  const skipKeys = new Set([
    "return",
    "child",
    "sibling",
    "alternate",
    "stateNode",
    "_owner",
    "_store",
    "deps",
    "destroy",
  ]);

  const keys = Object.keys(obj);
  for (let i = 0; i < Math.min(keys.length, 40); i++) {
    const k = keys[i];
    if (skipKeys.has(k) || k.startsWith("__react")) continue;
    let val;
    try {
      val = obj[k];
    } catch {
      continue;
    }
    if (val && typeof val === "object") {
      const found = findStoryInObject(val, depth - 1, seen);
      if (found) return found;
    }
  }

  return null;
}

function recordStoryUrl(url) {
  if (isStoryApiUrl(url)) {
    document.documentElement?.setAttribute("data-cerolingo-story-url", url);
  }
}

function recordStoryCandidate(candidate, url) {
  if (!isStoryObj(candidate)) return false;
  document.documentElement?.setAttribute(
    "data-cerolingo-story-json",
    JSON.stringify({ id: candidate.id, elements: candidate.elements }),
  );
  if (url && isStoryApiUrl(url)) {
    recordStoryUrl(url);
  } else if (
    typeof candidate.id === "string" &&
    candidate.id &&
    !document.documentElement?.hasAttribute("data-cerolingo-story-url")
  ) {
    recordStoryUrl(`https://stories.duolingo.com/api2/stories/${candidate.id}`);
  }
  return true;
}

function recordStoryJson(text, url) {
  if (typeof text !== "string" || !text.includes('"elements"')) return;
  try {
    const parsed = JSON.parse(text);
    const candidate = findStoryInObject(parsed, 3);
    if (candidate) {
      recordStoryCandidate(candidate, url);
    }
  } catch {}
}

if (typeof window.fetch === "function") {
  const origFetch = window.fetch;
  window.fetch = function (...args) {
    let reqUrl = "";
    try {
      reqUrl =
        typeof args[0] === "string"
          ? args[0]
          : args[0]?.url || args[0]?.href || "";
      recordStoryUrl(reqUrl);
    } catch {}
    const promise = origFetch.apply(this, args);
    if (!/\.(svg|png|jpe?g|gif|webp|woff2?|mp3|ogg|wav|css)(\?|$)/i.test(reqUrl)) {
      promise
        .then((res) => res.clone().text())
        .then((text) => {
          recordStoryJson(text, reqUrl);
        })
        .catch(() => {});
    }
    return promise;
  };
}

if (window.XMLHttpRequest) {
  const origOpen = window.XMLHttpRequest.prototype.open;
  window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      const reqUrl =
        typeof url === "string" ? url : url?.href || String(url || "");
      recordStoryUrl(reqUrl);
      if (
        !/\.(svg|png|jpe?g|gif|webp|woff2?|mp3|ogg|wav|css)(\?|$)/i.test(reqUrl)
      ) {
        this.addEventListener("load", function () {
          try {
            let text = "";
            if (!this.responseType || this.responseType === "text") {
              text =
                typeof this.responseText === "string" ? this.responseText : "";
            } else if (this.response && typeof this.response === "object") {
              text = JSON.stringify(this.response);
            } else if (typeof this.response === "string") {
              text = this.response;
            }
            recordStoryJson(text, reqUrl);
          } catch {}
        });
      }
    } catch {}
    return origOpen.call(this, method, url, ...rest);
  };
}

function searchFiberForStory(startNode, maxNodes, visited) {
  const queue = [startNode];
  while (queue.length > 0 && visited.size < maxNodes) {
    const node = queue.shift();
    if (!node || visited.has(node)) continue;
    visited.add(node);

    const fromProps = findStoryInObject(node.memoizedProps, 3);
    if (fromProps && recordStoryCandidate(fromProps)) return true;

    let s = node.memoizedState;
    let hookSteps = 0;
    while (s && hookSteps < 40) {
      hookSteps++;
      const ms = s.memoizedState ?? s;
      const fromState = findStoryInObject(ms, 3);
      if (fromState && recordStoryCandidate(fromState)) return true;
      const fromQueue = findStoryInObject(s.queue?.lastRenderedState, 3);
      if (fromQueue && recordStoryCandidate(fromQueue)) return true;
      s = s.next;
    }

    if (node.child) queue.push(node.child);
    if (node.sibling) queue.push(node.sibling);
  }
  return false;
}

function extractStoryFromFiber() {
  const storyDomEl = document.querySelector(
    '[data-test="stories-element"], button[data-test="story-start"], button[data-test="stories-player-continue"], button[data-test="stories-player-done"], button[data-test="stories-choice"], img[src*="stories-cdn.duolingo.com"]',
  );
  if (!storyDomEl) return;

  const visited = new Set();

  const elFiberKey = Object.keys(storyDomEl).find(
    (k) =>
      k.startsWith("__reactFiber$") || k.startsWith("__reactInternalInstance$"),
  );
  if (elFiberKey) {
    let curr = storyDomEl[elFiberKey];
    while (curr) {
      const fromProps = findStoryInObject(curr.memoizedProps, 3);
      if (fromProps && recordStoryCandidate(fromProps)) return;

      let s = curr.memoizedState;
      let hookSteps = 0;
      while (s && hookSteps < 40) {
        hookSteps++;
        const ms = s.memoizedState ?? s;
        const fromState = findStoryInObject(ms, 3);
        if (fromState && recordStoryCandidate(fromState)) return;
        const fromQueue = findStoryInObject(s.queue?.lastRenderedState, 3);
        if (fromQueue && recordStoryCandidate(fromQueue)) return;
        s = s.next;
      }

      curr = curr.return;
    }

    if (searchFiberForStory(storyDomEl[elFiberKey], 1500, visited)) {
      return;
    }
  }

  const root = document.querySelector("#root");
  if (root) {
    const fiberKey = Object.keys(root).find(
      (k) =>
        k.startsWith("__reactContainer$") ||
        k.startsWith("__reactFiber$") ||
        k.startsWith("__reactInternalInstance$"),
    );
    if (fiberKey) {
      searchFiberForStory(root[fiberKey], 10000, visited);
    }
  }
}

setInterval(extractStoryFromFiber, 250);
