function cLog(title, text) {
  console.log(
    `%c ${title} %c ${text} `,
    "background: #6877fe; color: #fff; font-weight: bold; border-radius: 4px 0 0 4px;",
    "background: #b3d0ff; color: #454faa; border-radius: 0 4px 4px 0;",
  );
}

const doAudioBlock =
  localStorage.getItem("audioBlock") === "false" ? false : true;

if (doAudioBlock) {
  window.HTMLAudioElement.prototype.play = function () {
    cLog("bypass", "HTML5 Audio auto-blocked");

    return;
  };

  if (window.AudioContext) {
    window.AudioContext.prototype.resume = function () {
      cLog("bypass", "AudioContext auto-blocked");

      return;
    };
  }
}
