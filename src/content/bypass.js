loadedLog("bypass");

function injectLegendaryBypass() {
  if (
    window.location.href.includes("/lesson") ||
    window.location.href.includes("/practice")
  ) {
    document.getElementById("legendaryBypass")?.remove();
    return;
  }

  chrome.storage.local.get(["legendaryBypass"], (data) => {
    const existing = document.getElementById("legendaryBypass");
    if (data.legendaryBypass === false) {
      existing?.remove();
      return;
    }
    if (existing) return;

    const practiceButton = document.querySelector(
      'a[href*="/lesson/"][href*="/level/"]:not([href*="test"]):not(#legendaryBypass)',
    );
    if (!practiceButton) return;

    const lessonHref = practiceButton.getAttribute("href") || "";
    const legendaryHref = lessonHref.replace("/level/", "/legendary/");
    if (legendaryHref === lessonHref) return;

    const legendaryButton = document.querySelector(
      '[data-test*="legendary-node-button"]',
    );
    const bypassBtn = practiceButton.cloneNode(true);

    bypassBtn.innerText = "Legendary Bypass +40 XP";
    bypassBtn.id = "legendaryBypass";
    bypassBtn.removeAttribute("type");
    bypassBtn.setAttribute("href", legendaryHref);

    const target = legendaryButton || practiceButton;
    target.parentNode?.appendChild(bypassBtn);
  });
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes.legendaryBypass) {
    injectLegendaryBypass();
  }
});

setInterval(injectLegendaryBypass, 150);
