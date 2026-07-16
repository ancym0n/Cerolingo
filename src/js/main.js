const settingsCheck = ["audioBlock", "storyHighlight", "legendaryBypass"];
chrome.storage.local.get(settingsCheck, (data) => {
  console.log(data);
  settingsCheck.forEach((stng) => {
    if (!data[stng] && data[stng] != false) {
      if (stng === "audioBlock") localStorage.setItem("audioBlock", "true");
      chrome.storage.local.set({ [stng]: true });
    }
  });
});

function loadedLog(filename) {
  console.log(
    `%c ${filename}.js %c loaded `,
    `background: #6877fe; color: #e7ecff; padding: 3px 5px; border-radius: 4px 0 0 4px; font-weight: bold; font-family: sans-serif;`,
    `background: #a1b2ff; color: #454faa; padding: 3px 5px; border-radius: 0 4px 4px 0; font-weight: bold; font-family: sans-serif;`,
  );
}

loadedLog("main");

// Story lesson loop
const checkLesson = setInterval(() => {
  if (
    window.location.href.includes("/lesson") ||
    window.location.href.includes("/stories")
  ) {
    if (document.getElementById("CEROLINGO") === null) run();
  } else {
    chrome.storage.local.get(["url", "loop"], (data) => {
      if (
        data.url &&
        data.url.includes("/lesson/") &&
        data.url != null &&
        data.loop === true
      ) {
        //console.log(data.loop);
        window.location.href = data.url.replace("level", "legendary");
      }
    });
  }
}, 1000);

function run() {
  const cerolingo = document.createElement("div");
  cerolingo.id = "CEROLINGO";
  document.body.appendChild(cerolingo);

  let jsons;
  let jsonInterval = setInterval(() => {
    jsons = performance
      .getEntriesByType("resource")
      .filter((resource) =>
        resource.name.startsWith("https://stories.duolingo.com/api2/"),
      )
      .map((resource) => resource.name);
    const lessonJsonURL = jsons[0];
    if (jsons.length > 0) {
      const linkToSave = jsons[0].split("?")[0];
      const lessonURL = window.location.href;
      chrome.storage.local.set({ storyId: linkToSave, url: lessonURL }, () => {
        console.log("Story ID saved to storage:", linkToSave, lessonURL);
      });
      console.log(lessonJsonURL);
      clearInterval(jsonInterval);
      autoAnswerBot(lessonJsonURL);
    }
  }, 200);
  setTimeout(() => {
    clearInterval(jsonInterval);
  }, 10000);
}
