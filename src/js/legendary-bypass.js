loadedLog("legendary-bypass.js");

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

  const legendaryButton = document.querySelector(
    '[data-test*="legendary-node-button"]',
  );
  const legendaryBypass = practiceButton.cloneNode(true);

  legendaryBypass.innerText = "Legendary Bypass +<40px";
  legendaryBypass.setAttribute("id", "legendaryBypass");
  legendaryBypass.removeAttribute("type");

  const lessonHref = practiceButton.getAttribute("href");
  const updatedHref = lessonHref.replace("level", "legendary");
  legendaryBypass.setAttribute("href", updatedHref);

  const whereToAppend = legendaryButton ? legendaryButton : practiceButton;
  whereToAppend.parentNode.appendChild(legendaryBypass);
}

setInterval(injectLegendaryBypass, 100);
