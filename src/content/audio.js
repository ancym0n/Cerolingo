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
      url.includes("/api2/stories/")) &&
    !url.includes("/complete")
  );
}

function recordStoryUrl(url) {
  if (isStoryApiUrl(url)) {
    document.documentElement?.setAttribute("data-cerolingo-story-url", url);
  }
}

function recordStoryJson(text, url) {
  if (typeof text === "string" && text.includes('"elements"')) {
    document.documentElement?.setAttribute("data-cerolingo-story-json", text);
    if (url) recordStoryUrl(url);
  }
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
    if (isStoryApiUrl(reqUrl)) {
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
      if (isStoryApiUrl(reqUrl)) {
        recordStoryUrl(reqUrl);
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

function extractStoryFromFiber() {
  if (document.documentElement?.hasAttribute("data-cerolingo-story-json")) {
    return;
  }
  if (!document.querySelector('[data-test="stories-element"]')) {
    return;
  }

  const isStoryObj = (obj) =>
    obj &&
    typeof obj === "object" &&
    Array.isArray(obj.elements) &&
    obj.elements.length > 0 &&
    obj.elements.some((el) => el && typeof el.type === "string");

  const root = document.querySelector("#root");
  if (root) {
    const fiberKey = Object.keys(root).find(
      (k) =>
        k.startsWith("__reactContainer$") ||
        k.startsWith("__reactFiber$") ||
        k.startsWith("__reactInternalInstance$"),
    );
    if (fiberKey) {
      const visited = new Set();
      const queue = [root[fiberKey]];
      while (queue.length > 0 && visited.size < 2500) {
        const node = queue.shift();
        if (!node || visited.has(node)) continue;
        visited.add(node);

        const p = node.memoizedProps;
        if (p) {
          const candidate = isStoryObj(p)
            ? p
            : isStoryObj(p.story)
              ? p.story
              : isStoryObj(p.storyData)
                ? p.storyData
                : null;
          if (candidate) {
            recordStoryJson(JSON.stringify({ elements: candidate.elements }));
            return;
          }
        }

        let s = node.memoizedState;
        while (s) {
          const ms = s.memoizedState;
          if (ms && typeof ms === "object") {
            const candidate = isStoryObj(ms)
              ? ms
              : isStoryObj(ms.story)
                ? ms.story
                : isStoryObj(ms.storyData)
                  ? ms.storyData
                  : null;
            if (candidate) {
              recordStoryJson(JSON.stringify({ elements: candidate.elements }));
              return;
            }
          }
          s = s.next;
        }

        if (node.child) queue.push(node.child);
        if (node.sibling) queue.push(node.sibling);
      }
    }
  }
}

setInterval(extractStoryFromFiber, 300);
