loadedLog("highlight");

const storyHighlightId = "cerolingoStoryHighlightStyle";
const storyHighlightStyle = document.createElement("style");
storyHighlightStyle.id = storyHighlightId;

storyHighlightStyle.textContent = `
button[aria-label="Story"]:has(img[src*=".svg"]) {
  scale: 1.15;
}

button[aria-label="Story"]:has(svg):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
),
button[data-test*="skill-path-level"]:has(svg):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
),
button[data-test*="skill-path-level"]:has(+ div):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
) {
  --path-level-color: var(--dark-main-color) !important;
}

button[aria-label="Story"]:has(svg):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
)::after,
button[data-test*="skill-path-level"]:has(svg):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
)::after,
button[data-test*="skill-path-level"]:has(+ div):has(img[src*=".svg"]):not(
  :has(img[src*="3ea75bf2164eed9218a7163be002af82.svg"])
)::after {
  box-shadow:
    0 8px 0 rgb(var(--color-black), 0.2),
    0 8px 0 var(--path-level-color) !important;
}

button[aria-label="Story"] svg,
button[data-test*="skill-path-level"]:has(img[src*=".svg"]) svg {
  color: var(--alt-main-color) !important;
}
`;

function updateStoryHighlight() {
  chrome.storage.local.get(["storyHighlight", "botHighlight"], (data) => {
    const existing = document.getElementById(storyHighlightId);
    if (data.storyHighlight) {
      if (!existing) document.head.appendChild(storyHighlightStyle);
    } else if (existing) {
      existing.remove();
    }

    if (data.botHighlight === false) {
      document.body?.classList.add("cerolingo-no-fx");
    } else {
      document.body?.classList.remove("cerolingo-no-fx");
    }
  });
}

updateStoryHighlight();
setInterval(updateStoryHighlight, 500);
