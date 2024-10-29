let storageitems = [
  "url",
  "wordBank",
  "verticalAnswers",
  "horizontalAnswers",
  "wordConnect",
];

let targetURL;
let wordBankAns;
let listAnswerAns;
let listAnswerWideAns;
let finalWordsAns;

// [ 🖱️ ] Simulates pressing numbers from 0 to 9
function simulateKeyPress(digit) {
  let key = digit.toString();
  let code = `Digit${key}`;
  let keyCode = key.charCodeAt(0);

  ["keydown", "keypress", "keyup"].forEach((eventType) => {
    let event = new KeyboardEvent(eventType, {
      key: key,
      code: code,
      keyCode: keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  });
}

// [ 📝 ] Convert text into Cerolingo-readable arrays
function convertToSubArrays(arr) {
  let tempArr = [];
  arr = arr.replace("  ", " ").replace(", ", ",").split("\n");
  arr.forEach((e) => {
    if (e.includes(",")) e = e.split(",");
    tempArr.push(e);
  });
  return tempArr;
}

// [ ✨ ] Enhanced way to console.log
function log(type, text) {
  if (type === "title") {
    console.log(
      "%c" + text,
      "font-size: 30px; font-weight: bold; color: #90EE90;"
    );
  } else if (type === 1) {
    console.log("%c[CLingo] " + text, "font-size: 16px; color: #ddfada;");
  } else {
    console.log("%c[CLingo] " + text, "font-size: 25px; color: #ddfada;");
  }
}

// [ ⏳ ] Load config from popup
chrome.storage.sync.get(storageitems, (data) => {
  targetURL = data.url || "";
  wordBankAns = convertToSubArrays(data.wordBank || "");
  listAnswerAns = convertToSubArrays(data.verticalAnswers || "");
  listAnswerWideAns = convertToSubArrays(data.horizontalAnswers || "");
  finalWordsAns = convertToSubArrays(data.wordConnect || "");

  storageitems.forEach((item) => {
    log(1, "Loaded " + item);
  });

  console.log(
    targetURL,
    wordBankAns,
    listAnswerAns,
    listAnswerWideAns,
    finalWordsAns
  );

  log("title", "Cerolingo Loaded");

  function pressStart() {
    log(1, "Looking for 'story-start' button");
    let startButton = document.querySelector('[data-test="story-start"]');
    if (!startButton) setTimeout(() => pressStart(), 200);
    else {
      log(0, "Started lesson");
      startButton.click();
      duoContinue();
    }
  }

  function duoContinue() {
    function duoReContinue() {
      setTimeout(() => duoContinue(), 500);
    }
    let continueButton = document.querySelector(
      '[data-test="stories-player-continue"]'
    );
    if (!continueButton) return false;
    let isDisabled = continueButton.getAttributeNames().includes("disabled");
    if (isDisabled) {
      {
        duoReContinue();
        if (!wordBank(wordBankAns))
          if (!listAnswer(listAnswerAns))
            if (!listAnswerWide(listAnswerWideAns)) finalWords(finalWordsAns);
      }
    } else {
      duoReContinue();
      setTimeout(() => {
        continueButton.click();
        document.title =
          "🔷 > " +
          parseInt(
            parseFloat(
              document
                .querySelector('[role="progressbar"]')
                .getAttribute("aria-valuenow")
            ) * 100
          ) +
          "%";
      }, 500);
    }
  }

  function listAnswerWide(answers) {
    let optionButtons = document.querySelectorAll(
      '[data-test="stories-choice"]'
    );
    if (!optionButtons) return false;
    let optionNames = [];
    for (var i = 0; i < optionButtons.length; i++) {
      optionNames.push(optionButtons[i].innerHTML);
    }
    let buttonToClick;

    for (var i = 0; i < answers.length; i++) {
      if (optionNames.includes(answers[i])) {
        buttonToClick = optionButtons[optionNames.indexOf(answers[i])];
      }
    }

    if (buttonToClick) {
      setTimeout(() => buttonToClick.click(), 100);
      return true;
    } else {
      return false;
    }
  }

  function wordBank(answers) {
    let optionButtons = document.querySelector('[data-test="word-bank"]');
    if (!optionButtons) return false;
    let optionText = document.querySelectorAll(
      '[data-test="challenge-tap-token-text"]'
    );
    let optionNames = [];
    for (var i = 0; i < optionText.length; i++) {
      optionNames.push(optionText[i].innerHTML);
    }

    // Checking if which answers are there
    let similarcount = 0;
    let foundAnswer;
    for (var i = 0; i < answers.length; i++) {
      let currentAnswer = answers[i];
      for (var g = 0; g < currentAnswer.length; g++) {
        for (var h = 0; h < optionNames.length; h++) {
          if (currentAnswer[g] === optionNames[h]) {
            similarcount += 1;
            if (similarcount === optionNames.length) {
              foundAnswer = currentAnswer;
            }
          }
        }
      }
    }

    // Clicking the answers
    foundAnswer.forEach((name) => {
      let indexNum = optionNames.indexOf(name);
      optionText[indexNum].click();
    });
    return true;
  }

  function listAnswer(answers) {
    let getAllLists = document.querySelectorAll("ul");
    if (!getAllLists) return false;
    let optionList = getAllLists[0];
    let liTexts = optionList
      ? Array.from(optionList.querySelectorAll("li")).map((li) => li.innerText)
      : [];

    let checkButton;
    liTexts.forEach((ans) => {
      if (answers.includes(ans)) {
        let indexNum = liTexts.indexOf(ans);
        let buttonToClick = optionList.querySelector(
          `li:nth-child(${indexNum + 1})`
        );
        buttonToClick.querySelector("button").click();
        checkButton = buttonToClick;
      }
    });
    if (!checkButton) return false;
  }

  function finalWords(answers) {
    let getAllLists = false;
    try {
      getAllLists = document.querySelectorAll("ul");
    } catch {
      return false;
    }
    if (!getAllLists) return false;
    let elementList1 = getAllLists[0];
    let elementList2 = getAllLists[1];

    let textList1 = [];
    let textList2 = [];

    [textList1, textList2].forEach((list) => {
      let temp;
      if (list === textList1) temp = elementList1;
      else temp = elementList2;
      if (!temp) return false;
      temp.querySelectorAll("li").forEach((e) => {
        list.push(e.textContent.replace(/\d+/g, ""));
      });
    });

    let delay = 0;
    textList1.forEach((text) => {
      answers.forEach((ansList) => {
        ansList.forEach((ans) => {
          if (text.includes(ans)) {
            delay += 1;
            let ansListIndex = ansList.indexOf(ans);
            let ansListOtherIndex = ansListIndex === 0 ? 1 : 0;
            let indexOfTheOne = textList1.indexOf(ansList[ansListIndex]) + 1;
            let indexOfTheTwo =
              textList2.indexOf(ansList[ansListOtherIndex]) + 6;
            if (indexOfTheTwo > 9) indexOfTheTwo = indexOfTheTwo = 0;
            setTimeout(() => {
              simulateKeyPress(indexOfTheOne);
              simulateKeyPress(indexOfTheTwo);
            }, 1 * delay);
          }
        });
      });
    });
  }

  function checkAndRedirect() {
    if (window.location.href !== targetURL) {
      document.title = "🔷 > Redirecting...";
      window.location.href = targetURL;
    }
  }

  checkAndRedirect();

  const observer = new MutationObserver(checkAndRedirect);
  observer.observe(document.body, { childList: true, subtree: true });

  //window.onload = function () {
  document.title = "🔷 > Loading";
  pressStart();
  setInterval(() => {
    let endlesson = document.querySelector('[data-test="stories-player-done"]');
    if (endlesson) endlesson.click();
  }, 250);
  //};
});
