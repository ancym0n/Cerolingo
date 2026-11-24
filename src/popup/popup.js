document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version");
  if (!versionElement) return;

  const { version } = chrome.runtime.getManifest();
  versionElement.textContent = `v${version}`;
});
