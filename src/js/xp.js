console.log("xp.js loaded");
let loopExploitEnabled = false;
let loopNum = 0;
setInterval(() => {
  if (!document.getElementById("pointExploitContainer")) {
    chrome.storage.sync.get(["storyId"], (data) => {
      if (data.storyId && !window.location.href.includes("/lesson")) {
        const containerDiv = document.createElement("div");
        containerDiv.setAttribute("id", "pointExploitContainer");
        containerDiv.style.zIndex = "1000";
        containerDiv.style.height = "230px";
        containerDiv.style.width = "200px";
        containerDiv.style.position = "fixed";
        containerDiv.style.bottom = "20px";
        containerDiv.style.right = "20px";
        containerDiv.style.padding = "10px";
        containerDiv.style.backgroundColor = "#131F24";
        containerDiv.style.border = "2.5px solid #37464F";
        containerDiv.style.borderRadius = "16px";
        containerDiv.style.display = "flex";
        containerDiv.style.flexDirection = "column";

        const text = document.createElement("p");
        text.innerText = "Point exploit\n+90 XP";
        text.style.textAlign = "center";

        const loopCount = document.createElement("p");
        loopCount.innerText = "Loop count: 0";
        loopCount.setAttribute("id", "loopCount");
        text.style.textAlign = "center";
        loopCount.style.fontSize = "12px";
        loopCount.style.margin = "0";
        loopCount.style.textAlign = "center";

        const button = document.createElement("button");
        button.textContent = "Give points";
        button.style.display = "block";
        button.style.border = "2px solid #37464F";
        button.style.borderRadius = "14px";
        button.style.background = "#42AADC";
        button.style.color = "#F0F0F0";
        button.style.padding = "10px 20px";
        button.style.cursor = "pointer";
        button.addEventListener("click", givePoint);

        const loopPoints = document.createElement("button");
        loopPoints.setAttribute("id", "loopPoints");
        loopPoints.textContent = "Start loop";
        loopPoints.style.display = "block";
        loopPoints.style.border = "2px solid #37464F";
        loopPoints.style.borderRadius = "14px";
        loopPoints.style.background = "#42AADC";
        loopPoints.style.color = "#F0F0F0";
        loopPoints.style.padding = "10px 20px";
        loopPoints.style.cursor = "pointer";
        loopPoints.style.marginTop = "5px";
        loopPoints.addEventListener("click", loopPointExploit);

        containerDiv.appendChild(text);
        containerDiv.appendChild(button);
        containerDiv.appendChild(loopPoints);
        containerDiv.appendChild(loopCount);
        document.body.appendChild(containerDiv);

        const draggable = document.getElementById("pointExploitContainer");
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        draggable.addEventListener("mousedown", (event) => {
          isDragging = true;
          offsetX = event.clientX - draggable.offsetLeft;
          offsetY = event.clientY - draggable.offsetTop;
          draggable.style.cursor = "grabbing";
        });

        document.addEventListener("mousemove", (event) => {
          if (isDragging) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const elementWidth = draggable.offsetWidth;
            const elementHeight = draggable.offsetHeight;

            let x = event.clientX - offsetX;
            let y = event.clientY - offsetY;

            x = Math.max(0, Math.min(x, viewportWidth - elementWidth));
            y = Math.max(0, Math.min(y, viewportHeight - elementHeight));

            draggable.style.left = `${x}px`;
            draggable.style.top = `${y}px`;
          }
        });

        document.addEventListener("mouseup", () => {
          isDragging = false;
          draggable.style.cursor = "grab";
        });

        window.addEventListener("resize", () => {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const elementWidth = draggable.offsetWidth;
          const elementHeight = draggable.offsetHeight;

          let x = parseInt(draggable.style.left, 10) || 0;
          let y = parseInt(draggable.style.top, 10) || 0;

          x = Math.max(0, Math.min(x, viewportWidth - elementWidth));
          y = Math.max(0, Math.min(y, viewportHeight - elementHeight));

          draggable.style.left = `${x}px`;
          draggable.style.top = `${y}px`;
        });
      }
    });
  }
}, 1000);

function givePoint() {
  const bearerToken =
    "Bearer " + (document.cookie.match(/jwt_token=([^;]*)/)?.[1] || "");

  const currentTimeMillis = Date.now();
  const unixTimestamp = Math.floor(currentTimeMillis / 1000);

  const payload = {
    awardXp: true,
    completedBonusChallenge: true,
    dailyRefreshInfo: null,
    fromLanguage: "en",
    hasXpBoost: true,
    illustrationFormat: "svg",
    isFeaturedStoryInPracticeHub: false,
    isLegendaryMode: true,
    isListenModeReAdoption: false,
    isV2Redo: true,
    isV2Story: true,
    learningLanguage: "en",
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

  chrome.storage.sync.get(["storyId"], (data) => {
    if (data.storyId) {
      console.log("Retrieved Story ID:", data.storyId);
      sendPOST(data.storyId, bearerToken, payload);
    } else {
      console.log("No Story ID found in storage.");
    }
  });

  function sendPOST(url, bearerToken, payload) {
    fetch(url + "/complete", {
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
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => console.log("+90XP\nResponse Data:", data))
      .catch((error) => console.error("Error:", error));
  }
}

function loopPointExploit() {
  loopExploitEnabled = !loopExploitEnabled;
  let loopPointsElement = document.getElementById("loopPoints");

  if (loopExploitEnabled) {
    loopPointsElement.innerText = "Stop loop";
    loopPointsElement.style.background = "#8FE91E";
    loopPointsElement.style.color = "#F0F0F0";
  } else {
    loopPointsElement.innerText = "Start loop";
    loopPointsElement.style.background = "#42AADC";
    loopPointsElement.style.color = "#F0F0F0";
  }

  let loopExploitInterval = setInterval(() => {
    if (loopExploitEnabled) {
      loopNum += 1;
      givePoint();
      let loopCountElement = document.getElementById("loopCount");
      loopCountElement.innerText =
        "Loop count: " + loopNum + "\n~" + loopNum * 90 + " XP";
    } else clearInterval(loopExploitInterval);
  }, 1000);
}
