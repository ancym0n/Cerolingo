document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version");
  const urlInput = document.getElementById("url");
  const loopCheckbox = document.getElementById("loopCheckbox");

  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifestData.version}`;

  chrome.storage.local.get(["url", "loop"], (data) => {
    if (data.url) urlInput.value = data.url;
    if (data.loop !== undefined) loopCheckbox.checked = data.loop;
  });

  urlInput.addEventListener("input", () => {
    chrome.storage.local.set({ url: urlInput.value });
  });

  loopCheckbox.addEventListener("change", () => {
    chrome.storage.local.set({ loop: loopCheckbox.checked });
  });
});
