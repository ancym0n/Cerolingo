loadedLog("mod-menu");

const modMenuId = "cerolingoModMenu";
const transitionDelay = 300; // 300ms === 0.3s
const loadThreshold = 2000;

setInterval(() => {
  if (!document.getElementById(modMenuId)) {
    chrome.storage.local.get(["storyId", "currentView"], (data) => {
      //if (data.storyId && !window.location.href.includes("/lesson")) {

      const bodyStyle = window.getComputedStyle(document.body);

      const containerDiv = document.createElement("div");
      containerDiv.id = modMenuId;
      containerDiv.style.backgroundColor = bodyStyle.backgroundColor;

      // Dynamic background color
      setInterval(() => {
        containerDiv.style.backgroundColor = window.getComputedStyle(
          document.body,
        ).backgroundColor;
      }, 500);

      const titleBar = document.createElement("div");
      titleBar.id = modMenuId + "TitleBar";
      titleBar.ondblclick = toggleMenu;

      const titleBarImg = document.createElement("img");
      titleBarImg.src = chrome.runtime.getURL("src/img/cerolingo-title.svg");

      const version = document.createElement("p");
      version.id = modMenuId + "Version";
      version.textContent = "v" + chrome.runtime.getManifest().version;

      const menuContent = document.createElement("div");
      menuContent.id = modMenuId + "Content";

      // const text = document.createElement("p");
      // text.innerText = "Point exploit\n+90 XP";

      // const loopCount = document.createElement("p");
      // loopCount.setAttribute("id", "loopCount");
      // loopCount.innerText = "Loop count: 0";

      // const button = document.createElement("button");
      // button.textContent = "Give points";
      // button.addEventListener("click", givePoint);

      // const loopPoints = document.createElement("button");
      // loopPoints.setAttribute("id", "loopPoints");
      // loopPoints.textContent = "Start loop";
      // loopPoints.addEventListener("click", loopPointExploit);

      titleBar.appendChild(titleBarImg);
      containerDiv.appendChild(version);
      containerDiv.appendChild(titleBar);
      containerDiv.appendChild(menuContent);
      // containerDiv.appendChild(text);
      // containerDiv.appendChild(button);
      // containerDiv.appendChild(loopPoints);
      // containerDiv.appendChild(loopCount);
      document.body.appendChild(containerDiv);

      console.log("Data", data);
      if (!data.currentView) loadView("main");
      else loadView(data.currentView);

      // Draggable menu
      let isDragging = false;
      let offsetX = 0;
      let offsetY = 0;
      let ticking = false;

      const getEventCoords = (e) =>
        e.type.includes("touch") ? e.touches[0] : e;

      const dragStart = (e) => {
        if (e.target.tagName === "BUTTON") return;

        isDragging = true;
        containerDiv.style.cursor = "grabbing";

        const coords = getEventCoords(e);
        const rect = containerDiv.getBoundingClientRect();

        containerDiv.style.bottom = "auto";
        containerDiv.style.right = "auto";
        containerDiv.style.left = `${rect.left}px`;
        containerDiv.style.top = `${rect.top}px`;

        offsetX = coords.clientX - rect.left;
        offsetY = coords.clientY - rect.top;
      };

      const dragMove = (e) => {
        if (!isDragging) return;

        if (!ticking) {
          const coords = getEventCoords(e);

          window.requestAnimationFrame(() => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const elementWidth = containerDiv.offsetWidth;
            const elementHeight = containerDiv.offsetHeight;

            let x = coords.clientX - offsetX;
            let y = coords.clientY - offsetY;

            x = Math.max(0, Math.min(x, viewportWidth - elementWidth));
            y = Math.max(0, Math.min(y, viewportHeight - elementHeight));

            containerDiv.style.left = `${x}px`;
            containerDiv.style.top = `${y}px`;

            ticking = false;
          });
          ticking = true;
        }
      };

      const dragEnd = () => {
        isDragging = false;
        containerDiv.style.cursor = "grab";
      };

      containerDiv.addEventListener("mousedown", dragStart);
      containerDiv.addEventListener("touchstart", dragStart, { passive: true });

      document.addEventListener("mousemove", dragMove);
      document.addEventListener("touchmove", dragMove, { passive: true });

      document.addEventListener("mouseup", dragEnd);
      document.addEventListener("touchend", dragEnd);

      window.addEventListener("resize", () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elementWidth = containerDiv.offsetWidth;
        const elementHeight = containerDiv.offsetHeight;

        let x = parseInt(containerDiv.style.left, 10) || 0;
        let y = parseInt(containerDiv.style.top, 10) || 0;

        x = Math.max(0, Math.min(x, viewportWidth - elementWidth));
        y = Math.max(0, Math.min(y, viewportHeight - elementHeight));

        containerDiv.style.left = `${x}px`;
        containerDiv.style.top = `${y}px`;
        s;
      });
      //}
    });
  }
}, 1000);

async function loadView(id) {
  let delay = 0;
  if (performance.now() > loadThreshold) {
    transitionView();
    delay = transitionDelay * 2;
  }

  chrome.storage.local.set({ currentView: id });
  const menuContent = document.getElementById(modMenuId + "Content");
  const data = await chrome.storage.local.get(["storyId", "loop", "url"]);

  let elements = [];

  if (id === "main") {
    const buttons = [
      ["story", "Lesson loop"],
      ["xp", "XP Farming"],
      ["settings", "Settings"],
    ];

    buttons.forEach((btn) => {
      const viewId = btn[0];
      const buttonText = btn[1];

      const btnElement = document.createElement("button");
      btnElement.setAttribute("view", viewId);
      btnElement.textContent = buttonText;
      btnElement.onclick = () => loadView(viewId);

      elements.push(btnElement);
    });
  } else if (id === "settings" && data.storyId) {
    const settings = [
      ["audioBlock", "Audio blocking"],
      ["storyHighlight", "Lessons highlighter"],
      ["legendaryBypass", "Legendary bypass"],
    ];

    settings.forEach((stng) => {
      const storageId = stng[0];
      const buttonText = stng[1];

      const btnElement = document.createElement("button");
      btnElement.textContent = buttonText;
      chrome.storage.local.get([storageId], (data) => {
        btnElement.setAttribute("toggle", data[storageId]);
      });
      btnElement.onclick = () => {
        const currentState =
          btnElement.getAttribute("toggle") === "true" ? true : false;
        const changedState = !currentState;
        btnElement.setAttribute("toggle", changedState.toString());
        chrome.storage.local.set({ [storageId]: changedState });

        if (storageId === "audioBlock")
          localStorage.setItem("audioBlock", changedState.toString());

        console.log(
          `Changed state of ${storageId} from ${currentState} to ${changedState}`,
        );
      };

      elements.push(btnElement);
    });
  } else if (id === "xp" && data.storyId) {
    const activateOnceBtn = document.createElement("button");
    activateOnceBtn.textContent = "Instant 90 XP";
    activateOnceBtn.onclick = () => {
      clickTransition(activateOnceBtn);
      givePoints();
    };

    const xpFarmBtn = document.createElement("button");
    xpFarmBtn.id = modMenuId + "Loop";
    xpFarmBtn.textContent = "Start loop";
    xpFarmBtn.setAttribute("running", "false");
    xpFarmBtn.onclick = () => {
      clickTransition(xpFarmBtn);
      loopPointExploit(xpFarmBtn);
    };

    [activateOnceBtn, xpFarmBtn].forEach((e) => elements.push(e));
  } else if (id === "story" && data.url) {
    const lessonLoopBtn = document.createElement("button");
    lessonLoopBtn.setAttribute("running", data.loop ? "true" : "false");
    lessonLoopBtn.textContent = data.loop
      ? "Stop lesson loop"
      : "Start lesson loop";
    console.log(data.loop);
    lessonLoopBtn.onclick = () => {
      const isRunning = lessonLoopBtn.getAttribute("running") != "true";
      lessonLoopBtn.setAttribute("running", isRunning ? "true" : "false");
      chrome.storage.local.set({ loop: isRunning ? true : false });
      lessonLoopBtn.textContent = isRunning
        ? "Stop lesson loop"
        : "Start lesson loop";
    };

    elements.push(lessonLoopBtn); //here
  } else if (!data.storyId || !data.url) {
    const xpActivationInfo = document.createElement("p");
    xpActivationInfo.id = modMenuId + "ActivationInfo";
    xpActivationInfo.textContent = `Unable to find Story ${id === "xp" ? "ID" : "URL"}. Please complete one story lesson first.`;

    elements.push(xpActivationInfo);
  }

  setTimeout(() => {
    if (id !== "main") {
      const backBtn = document.createElement("button");
      backBtn.id = modMenuId + "BackButton";
      backBtn.textContent = "Back";
      backBtn.onclick = () => loadView("main");
      elements.push(backBtn);
    }

    const transitionDiv = document.getElementById(modMenuId + "Transition");

    if (transitionDiv) {
      menuContent.replaceChildren(transitionDiv);
    } // else {
    //   menuContent.innerHTML = "";
    // }
    elements.forEach((e) => {
      menuContent.appendChild(e);
    });
  }, delay);
}

function toggleMenu() {
  const className = "cerolingoMinimized";
  const container = document.getElementById(modMenuId);
  if (container.classList.contains(className)) {
    container.classList.remove(className);
  } else {
    container.classList.add(className);
  }
}

function transitionView() {
  const menu = document.getElementById("cerolingoModMenuContent");
  const div = document.createElement("div");
  div.id = modMenuId + "Transition";
  div.style.opacity = 0;

  div.style.backgroundColor = window.getComputedStyle(
    document.body,
  ).backgroundColor;

  menu.appendChild(div);

  setTimeout(() => (div.style.opacity = 1), transitionDelay);
  setTimeout(() => {
    div.style.opacity = 0;
  }, transitionDelay * 2.2);
  setTimeout(() => div.remove(), transitionDelay * 3.2);
}

function clickTransition(el) {
  el.classList.add("cerolingoButtonClicked");
  setTimeout(() => {
    el.classList.remove("cerolingoButtonClicked");
  }, 300);
}
