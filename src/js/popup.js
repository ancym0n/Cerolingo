document.addEventListener("DOMContentLoaded", () => {
  const versionElement = document.getElementById("version");
  const urlInput = document.getElementById("url");
  const wordBankTextarea = document.getElementById("wb");
  const verticalAnswersTextarea = document.getElementById("ver");
  const horizontalAnswersTextarea = document.getElementById("hor");
  const wordConnectTextarea = document.getElementById("wc"); // New Word Connect textarea

  // Load manifest data
  const manifestData = chrome.runtime.getManifest();
  versionElement.textContent = `v${manifestData.version}`;

  // Load saved data for each input
  chrome.storage.sync.get(
    ["url", "wordBank", "verticalAnswers", "horizontalAnswers", "wordConnect"],
    (data) => {
      if (data.url) urlInput.value = data.url;
      if (data.wordBank) wordBankTextarea.value = data.wordBank;
      if (data.verticalAnswers)
        verticalAnswersTextarea.value = data.verticalAnswers;
      if (data.horizontalAnswers)
        horizontalAnswersTextarea.value = data.horizontalAnswers;
      if (data.wordConnect) wordConnectTextarea.value = data.wordConnect; // Load Word Connect value
    }
  );

  urlInput.addEventListener("input", () => {
    chrome.storage.sync.set({ url: urlInput.value });
  });
  wordBankTextarea.addEventListener("input", () => {
    chrome.storage.sync.set({ wordBank: wordBankTextarea.value });
  });
  verticalAnswersTextarea.addEventListener("input", () => {
    chrome.storage.sync.set({ verticalAnswers: verticalAnswersTextarea.value });
  });
  horizontalAnswersTextarea.addEventListener("input", () => {
    chrome.storage.sync.set({
      horizontalAnswers: horizontalAnswersTextarea.value,
    });
  });
  wordConnectTextarea.addEventListener("input", () => {
    chrome.storage.sync.set({ wordConnect: wordConnectTextarea.value });
  });
});
