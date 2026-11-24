loadedLog("xp");

let loopExploitEnabled = false;
let loopExploitInterval = null;
let loopNum = 0;
let lastKnownTotalXp = null;
let lastKnownFromLanguage = "en";
let lastKnownLearningLanguage = "en";

function getAuthData() {
  const token = document.cookie.match(/jwt_token=([^;]*)/)?.[1] || "";
  let userId = null;

  if (token) {
    try {
      const base64Url = token.split(".")[1];
      if (base64Url) {
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(base64));
        userId = payload.sub || null;
      }
    } catch {
      userId = null;
    }
  }

  return { token, bearerToken: `Bearer ${token}`, userId };
}

const XP_ICON_URL =
  "https://d35aaqx5ub95lt.cloudfront.net/images/profile/01ce3a817dd01842581c3d18debcbc46.svg";

function renderXpBadge(targetBox) {
  const box = targetBox || document.getElementById("cerolingoModMenuXpStatus");
  if (!box) return;

  let icon = box.querySelector("#cerolingoModMenuXpIcon");
  let valSpan = box.querySelector("#cerolingoModMenuXpValue");

  if (!icon || !valSpan) {
    box.textContent = "";
    icon = document.createElement("img");
    icon.id = "cerolingoModMenuXpIcon";
    icon.src = XP_ICON_URL;
    icon.alt = "XP";

    valSpan = document.createElement("span");
    valSpan.id = "cerolingoModMenuXpValue";

    box.append(icon, valSpan);
  }

  valSpan.textContent =
    typeof lastKnownTotalXp === "number"
      ? `${lastKnownTotalXp.toLocaleString()} XP`
      : "...";
}

async function refreshXpStatusBox() {
  renderXpBadge();
  const { token, bearerToken, userId } = getAuthData();
  if (!token || !userId) return;

  try {
    const res = await fetch(
      `${window.location.origin}/2017-06-30/users/${userId}?fields=totalXp,fromLanguage,learningLanguage&_=${Date.now()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: bearerToken,
        },
        credentials: "include",
        cache: "no-store",
      },
    );

    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.fromLanguage === "string" && data.fromLanguage) {
      lastKnownFromLanguage = data.fromLanguage;
    }
    if (typeof data.learningLanguage === "string" && data.learningLanguage) {
      lastKnownLearningLanguage = data.learningLanguage;
    }
    if (typeof data.totalXp === "number") {
      lastKnownTotalXp = data.totalXp;
      renderXpBadge();
    }
  } catch {
    // ignore
  }
}

function givePoints() {
  const { bearerToken } = getAuthData();
  const unixTimestamp = Math.floor(Date.now() / 1000);

  const payload = {
    awardXp: true,
    completedBonusChallenge: true,
    dailyRefreshInfo: null,
    fromLanguage: lastKnownFromLanguage || "en",
    hasXpBoost: true,
    illustrationFormat: "svg",
    isFeaturedStoryInPracticeHub: false,
    isLegendaryMode: true,
    isListenModeReAdoption: false,
    isV2Redo: true,
    isV2Story: true,
    learningLanguage: lastKnownLearningLanguage || "en",
    masterVersion: false,
    maxScore: 6,
    mode: "READ",
    numHintsUsed: 0,
    pathLevelSpecifics: {
      mode: "read",
      score: 3,
      startTime: unixTimestamp,
    },
  };

  chrome.storage.local.get(["storyId"], (data) => {
    if (!data.storyId) return;

    fetch(`${data.storyId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: bearerToken,
        Accept: "application/json; charset=UTF-8",
        "Accept-Language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
        "X-Duo-Request-Host": "stories-edge.duolingo.com",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    })
      .then((res) => {
        refreshXpStatusBox();
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then((res) => cerolingoLog("xp", "+90 XP", res))
      .catch(() => {
        refreshXpStatusBox();
      });
  });
}

function loopPointExploit(el) {
  loopExploitEnabled = !loopExploitEnabled;

  if (loopExploitInterval) {
    clearInterval(loopExploitInterval);
    loopExploitInterval = null;
  }

  if (!loopExploitEnabled) {
    loopNum = 0;
    el.setAttribute("running", "false");
    el.innerText = "Start loop";
    return;
  }

  loopNum = 0;
  el.setAttribute("running", "true");
  el.innerText = "Stop loop";

  loopExploitInterval = setInterval(() => {
    if (!loopExploitEnabled) {
      clearInterval(loopExploitInterval);
      loopExploitInterval = null;
      return;
    }

    loopNum += 1;
    givePoints();

    const btn = document.getElementById(`${modMenuId}Loop`) || el;
    btn.innerText = "Stop loop";

    const loopCount = document.createElement("p");
    loopCount.id = `${modMenuId}LoopCount`;
    loopCount.textContent = `[${loopNum}] ~${loopNum * 90} XP`;
    btn.appendChild(loopCount);
  }, 1000);
}
