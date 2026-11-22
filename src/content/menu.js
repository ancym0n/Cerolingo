loadedLog("menu");

const modMenuId = "cerolingoModMenu";
const transitionDelay = 150;

let isDragging = false;
let dragMoved = false;
let startX = 0;
let startY = 0;
let offsetX = 0;
let offsetY = 0;
let ticking = false;

function clampPosition(el, x, y) {
  const maxX = Math.max(0, window.innerWidth - el.offsetWidth);
  const maxY = Math.max(0, window.innerHeight - el.offsetHeight);
  return {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
}

function applySavedPosition(el) {
  const savedX = localStorage.getItem("cerolingoMenuX");
  const savedY = localStorage.getItem("cerolingoMenuY");

  if (savedX !== null && savedY !== null) {
    const { x, y } = clampPosition(
      el,
      parseInt(savedX, 10) || 0,
      parseInt(savedY, 10) || 0,
    );
    el.style.bottom = "auto";
    el.style.right = "auto";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }
}

function initModMenu() {
  if (document.getElementById(modMenuId) || !document.body) return;

  const containerDiv = document.createElement("div");
  containerDiv.id = modMenuId;
  containerDiv.style.backgroundColor = window.getComputedStyle(
    document.body,
  ).backgroundColor;

  if (localStorage.getItem("cerolingoMinimized") === "true") {
    containerDiv.classList.add("cerolingoMinimized");
  }

  const titleBar = document.createElement("div");
  titleBar.id = `${modMenuId}TitleBar`;

  const titleBarImg = document.createElement("img");
  titleBarImg.src = chrome.runtime.getURL("assets/title.svg");

  const version = document.createElement("p");
  version.id = `${modMenuId}Version`;
  version.textContent = `v${chrome.runtime.getManifest().version}`;

  const menuContent = document.createElement("div");
  menuContent.id = `${modMenuId}Content`;

  titleBar.appendChild(titleBarImg);
  containerDiv.appendChild(version);
  containerDiv.appendChild(titleBar);
  containerDiv.appendChild(menuContent);

  document.body.appendChild(containerDiv);
  applySavedPosition(containerDiv);

  chrome.storage.local.get(["currentView"], (data) => {
    loadView(data.currentView || "main", false);
  });

  const getEventCoords = (e) => (e.type.includes("touch") ? e.touches[0] : e);

  const dragStart = (e) => {
    if (e.target.tagName === "BUTTON" || e.target.tagName === "INPUT") return;

    const coords = getEventCoords(e);
    const rect = containerDiv.getBoundingClientRect();

    isDragging = true;
    dragMoved = false;
    startX = coords.clientX;
    startY = coords.clientY;
    containerDiv.style.cursor = "grabbing";

    containerDiv.style.bottom = "auto";
    containerDiv.style.right = "auto";
    containerDiv.style.left = `${rect.left}px`;
    containerDiv.style.top = `${rect.top}px`;

    offsetX = coords.clientX - rect.left;
    offsetY = coords.clientY - rect.top;
  };

  containerDiv.addEventListener("mousedown", dragStart);
  containerDiv.addEventListener("touchstart", dragStart, { passive: true });

  titleBar.addEventListener("click", () => {
    if (!dragMoved) toggleMenu();
  });
}

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;

  if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) {
    dragMoved = true;
  }

  if (ticking) return;
  ticking = true;

  window.requestAnimationFrame(() => {
    const containerDiv = document.getElementById(modMenuId);
    if (containerDiv && isDragging) {
      const { x, y } = clampPosition(
        containerDiv,
        e.clientX - offsetX,
        e.clientY - offsetY,
      );
      containerDiv.style.left = `${x}px`;
      containerDiv.style.top = `${y}px`;
    }
    ticking = false;
  });
});

document.addEventListener(
  "touchmove",
  (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];

    if (Math.hypot(touch.clientX - startX, touch.clientY - startY) > 4) {
      dragMoved = true;
    }

    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      const containerDiv = document.getElementById(modMenuId);
      if (containerDiv && isDragging) {
        const { x, y } = clampPosition(
          containerDiv,
          touch.clientX - offsetX,
          touch.clientY - offsetY,
        );
        containerDiv.style.left = `${x}px`;
        containerDiv.style.top = `${y}px`;
      }
      ticking = false;
    });
  },
  { passive: true },
);

const endDrag = () => {
  if (!isDragging) return;
  isDragging = false;

  const containerDiv = document.getElementById(modMenuId);
  if (containerDiv) {
    containerDiv.style.cursor = "grab";
    if (containerDiv.style.left && dragMoved) {
      localStorage.setItem(
        "cerolingoMenuX",
        parseInt(containerDiv.style.left, 10),
      );
      localStorage.setItem(
        "cerolingoMenuY",
        parseInt(containerDiv.style.top, 10),
      );
    }
  }
};

document.addEventListener("mouseup", endDrag);
document.addEventListener("touchend", endDrag);

window.addEventListener("resize", () => {
  const containerDiv = document.getElementById(modMenuId);
  if (!containerDiv || !containerDiv.style.left) return;

  const { x, y } = clampPosition(
    containerDiv,
    parseInt(containerDiv.style.left, 10) || 0,
    parseInt(containerDiv.style.top, 10) || 0,
  );
  containerDiv.style.left = `${x}px`;
  containerDiv.style.top = `${y}px`;
});

setInterval(() => {
  const containerDiv = document.getElementById(modMenuId);
  if (!containerDiv) {
    initModMenu();
  } else if (document.body) {
    containerDiv.style.backgroundColor = window.getComputedStyle(
      document.body,
    ).backgroundColor;
  }
}, 500);

chrome.storage.onChanged.addListener((changes) => {
  if (changes.storyId || changes.url || changes.loop) {
    chrome.storage.local.get(["currentView"], (data) => {
      if (data.currentView === "xp" || data.currentView === "story") {
        loadView(data.currentView, false);
      }
    });
  }
});

async function loadView(id, animate = true) {
  const containerDiv = document.getElementById(modMenuId);
  const menuContent = document.getElementById(`${modMenuId}Content`);
  if (!menuContent) return;

  chrome.storage.local.set({ currentView: id });

  if (animate) {
    menuContent.classList.add("cerolingoBlurOut");
  }

  const data = await chrome.storage.local.get(["storyId", "loop", "url"]);
  const elements = [];

  if (id === "main") {
    const buttons = [
      ["story", "Lesson loop"],
      ["xp", "XP Farming"],
      ["settings", "Settings"],
    ];

    buttons.forEach(([viewId, label]) => {
      const btn = document.createElement("button");
      btn.setAttribute("view", viewId);
      btn.textContent = label;
      btn.onclick = () => loadView(viewId, true);
      elements.push(btn);
    });
  } else if (id === "settings") {
    const settings = [
      ["autoSolver", "Auto solver"],
      ["botHighlight", "Blue animations"],
      ["audioBlock", "Audio blocking"],
      ["storyHighlight", "Lessons highlighter"],
      ["legendaryBypass", "Legendary bypass"],
    ];

    settings.forEach(([storageId, label]) => {
      const btn = document.createElement("button");
      btn.textContent = label;

      chrome.storage.local.get([storageId], (res) => {
        btn.setAttribute("toggle", res[storageId] !== false ? "true" : "false");
      });

      btn.onclick = () => {
        const nextState = btn.getAttribute("toggle") !== "true";
        btn.setAttribute("toggle", nextState.toString());
        chrome.storage.local.set({ [storageId]: nextState });

        if (
          storageId === "audioBlock" ||
          storageId === "autoSolver" ||
          storageId === "botHighlight"
        ) {
          localStorage.setItem(storageId, nextState.toString());
        }
      };

      elements.push(btn);
    });
  } else if (id === "xp" && data.storyId) {
    const xpStatus = document.createElement("div");
    xpStatus.id = `${modMenuId}XpStatus`;
    if (typeof renderXpBadge === "function") {
      renderXpBadge(xpStatus);
    }

    const activateOnceBtn = document.createElement("button");
    activateOnceBtn.textContent = "Instant 90 XP";
    activateOnceBtn.onclick = () => {
      clickTransition(activateOnceBtn);
      givePoints();
    };

    const xpFarmBtn = document.createElement("button");
    xpFarmBtn.id = `${modMenuId}Loop`;
    xpFarmBtn.textContent = loopExploitEnabled ? "Stop loop" : "Start loop";
    xpFarmBtn.setAttribute("running", loopExploitEnabled ? "true" : "false");
    if (loopExploitEnabled) {
      const loopCount = document.createElement("p");
      loopCount.id = `${modMenuId}LoopCount`;
      loopCount.textContent = `[${loopNum}] ~${loopNum * 90} XP`;
      xpFarmBtn.appendChild(loopCount);
    }
    xpFarmBtn.onclick = () => {
      clickTransition(xpFarmBtn);
      loopPointExploit(xpFarmBtn);
    };

    elements.push(xpStatus, activateOnceBtn, xpFarmBtn);
  } else if (id === "story" && data.url) {
    const lessonLoopBtn = document.createElement("button");
    lessonLoopBtn.setAttribute("running", data.loop ? "true" : "false");
    lessonLoopBtn.textContent = data.loop
      ? "Stop lesson loop"
      : "Start lesson loop";

    lessonLoopBtn.onclick = () => {
      const isRunning = lessonLoopBtn.getAttribute("running") !== "true";
      if (isRunning && typeof resetActionGuardState === "function") {
        resetActionGuardState();
      }
      lessonLoopBtn.setAttribute("running", isRunning ? "true" : "false");
      chrome.storage.local.set({ loop: isRunning });
      lessonLoopBtn.textContent = isRunning
        ? "Stop lesson loop"
        : "Start lesson loop";
    };

    elements.push(lessonLoopBtn);
  } else {
    const info = document.createElement("p");
    info.id = `${modMenuId}ActivationInfo`;
    info.textContent = `Unable to find Story ${id === "xp" ? "ID" : "URL"}. Please complete one story lesson first.`;
    elements.push(info);
  }

  if (id !== "main") {
    const backBtn = document.createElement("button");
    backBtn.id = `${modMenuId}BackButton`;
    backBtn.textContent = "Back";
    backBtn.onclick = () => loadView("main", true);
    elements.push(backBtn);
  }

  const swapContent = () => {
    if (containerDiv) {
      containerDiv.setAttribute("data-view", id);
    }
    menuContent.replaceChildren(...elements);
    if (
      id === "xp" &&
      data.storyId &&
      typeof refreshXpStatusBox === "function"
    ) {
      refreshXpStatusBox();
    }
    requestAnimationFrame(() => {
      menuContent.classList.remove("cerolingoBlurOut");
    });
  };

  if (animate) {
    setTimeout(swapContent, transitionDelay);
  } else {
    swapContent();
  }
}

function toggleMenu() {
  const container = document.getElementById(modMenuId);
  if (!container) return;

  const minimized = container.classList.toggle("cerolingoMinimized");
  localStorage.setItem("cerolingoMinimized", minimized.toString());

  if (!minimized && container.style.left) {
    setTimeout(() => {
      const { x, y } = clampPosition(
        container,
        parseInt(container.style.left, 10) || 0,
        parseInt(container.style.top, 10) || 0,
      );
      container.style.left = `${x}px`;
      container.style.top = `${y}px`;
    }, 300);
  }
}

function clickTransition(el) {
  el.classList.add("cerolingoButtonClicked");
  setTimeout(() => el.classList.remove("cerolingoButtonClicked"), 300);
}
