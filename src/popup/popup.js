document.addEventListener("DOMContentLoaded", async () => {
  const versionElement = document.getElementById("version");
  if (!versionElement) return;

  const { version } = chrome.runtime.getManifest();
  versionElement.textContent = `v${version}`;

  try {
    const res = await fetch(
      "https://api.github.com/repos/ancym0n/Cerolingo/releases/latest",
    );
    if (res.ok) {
      const data = await res.json();
      if (data?.tag_name) {
        versionElement.textContent = data.tag_name.startsWith("v")
          ? data.tag_name
          : `v${data.tag_name}`;
      }
    }
  } catch (_) {}
});
