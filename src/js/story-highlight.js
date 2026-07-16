loadedLog("story-highlight");

const storyHighlightId = "cerolingoStoryHighlightStyle";
const storyHighlightStyle = document.createElement("style");

storyHighlightStyle.innerHTML = `
button[aria-label="Story"]:has(img[src*=".svg"]) {
  scale: 1.2;
}

/* Doesn't affect disabled or undone story lessons */
button[aria-label="Story"]:has(svg):has(img[src*=".svg"]):not(
    :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
  ) {
  --path-level-color: var(--dark-main-color) !important;
}

button[aria-label="Story"]:has(svg):has(img[src*=".svg"]):not(
    :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
  )::after {
  box-shadow:
    0 8px 0 rgb(var(--color-black), 0.2),
    0 8px 0 var(--path-level-color) !important;
}

button[aria-label="Story"] svg {
  color: var(--alt-main-color) !important;
}
`;

storyHighlightStyle.id = storyHighlightId;

function addStoryHighlight() {
  chrome.storage.local.get(["storyHighlight"], (data) => {
    if (data.storyHighlight) document.head.appendChild(storyHighlightStyle);
    else document.getElementById(storyHighlightId).remove();
  });
}

addStoryHighlight();
setInterval(() => {
  addStoryHighlight();
}, 500);
