loadedLog("bypass");

function injectLegendaryBypass() {
  if (
    window.location.href.includes("/lesson") ||
    document.getElementById("legendaryBypass")
  ) {
    return;
  }

  const practiceButton = document.querySelector(
    "a[href*=lesson]:not([href*=test])",
  );
  if (!practiceButton) return;

  chrome.storage.local.get(["legendaryBypass"], (data) => {
    if (!data.legendaryBypass || document.getElementById("legendaryBypass")) {
      return;
    }

    const legendaryButton = document.querySelector(
      '[data-test*="legendary-node-button"]',
    );
    const bypassBtn = practiceButton.cloneNode(true);

    bypassBtn.innerText = "Legendary Bypass +<40px";
    bypassBtn.id = "legendaryBypass";
    bypassBtn.removeAttribute("type");

    const lessonHref = practiceButton.getAttribute("href");
    bypassBtn.setAttribute("href", lessonHref.replace("level", "legendary"));

    const target = legendaryButton || practiceButton;
    target.parentNode.appendChild(bypassBtn);
  });
}

setInterval(injectLegendaryBypass, 100);
