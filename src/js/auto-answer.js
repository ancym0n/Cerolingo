loadedLog("auto-answer");

async function autoAnswerBot(url) {
  let cookies = document.cookie;
  let jwtToken = cookies.match(/jwt_token=([^;]*)/)?.[1];
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${jwtToken}`,
        "Content-Type": "application/json",
        Cookie: cookies,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const questionList = data.elements.filter(
      (item) =>
        item.type !== "LINE" &&
        item.type !== "CHALLENGE_PROMPT" &&
        item.type !== "HEADER",
    );
    console.log(questionList);
    const answerMP = getAnswers(questionList, "MULTIPLE_CHOICE");
    const answerSP = getAnswers(questionList, "SELECT_PHRASE");
    const answerPTP = getAnswers(questionList, "POINT_TO_PHRASE");
    const answerA = getAnswers(questionList, "ARRANGE");
    const answerM = getAnswers(questionList, "MATCH");
    const answerGF = getAnswers(questionList, "GAP_FILL");

    const storyStart = setInterval(() => {
      const storyStartButton = document.querySelector(
        'button[data-test="story-start"]',
      );
      if (storyStartButton) {
        storyStartButton.click();
        clearInterval(storyStart);
      }
      setTimeout(() => clearInterval(storyStart), 10000);
    }, 100);

    const contClicker = setInterval(() => {
      let continueButton = document.querySelector(
        'button[data-test="stories-player-continue"]',
      );
      if (continueButton && !continueButton.disabled) {
        continueButton.click();
      } else {
        const buttons = document.querySelectorAll(
          'button[data-test="stories-choice"]',
        );
        buttons.forEach((btn) => {
          if (answerSP.includes(btn.innerText)) btn.click();
          else if (answerMP.includes(btn.nextElementSibling?.textContent))
            btn.click();
        });
        if (buttons.length === 0) {
          let challengeButtons = document.querySelectorAll(
            'button[data-test*="challenge-tap-token"]',
          );

          if (challengeButtons.length < 8) {
            // Answer type: Gap Fill
            if (document.querySelector('[data-test="word-bank"]') !== null) {
              answerGF.forEach((ans) => {
                challengeButtons.forEach((btn) =>
                  ans == btn.innerText ? btn.click() : null,
                );
              });
            }

            // Answer type: Arrange
            let filled = false;
            challengeButtons.forEach((i) => {
              if (answerPTP.includes(i.innerText)) {
                filled = true;
                i.click();
              }
              if (
                i === challengeButtons[challengeButtons.length - 1] &&
                filled === false
              ) {
                answerA.forEach((ansA) => {
                  ansA.forEach((a) => {
                    challengeButtons.forEach((cbtn) => {
                      if (cbtn.innerText === a) cbtn.click();
                    });
                  });
                });
              }
            });
          } else {
            answerM.forEach((match) => {
              challengeButtons.forEach((btn) => {
                let btntext = btn.innerText.replace(/[\d\n]/g, "");
                if (match.includes(btntext)) btn.click();
              });
            });
          }
        }
        let endButton = document.querySelector(
          'button[data-test="stories-player-done"]',
        );
        if (endButton) {
          clearInterval(contClicker);
          endButton.click();
          document.getElementById("CEROLINGO").remove();
        }
      }
    }, 100);
    return data;
  } catch (error) {
    console.error("Error fetching the JSON:", error);
  }
}

function getAnswers(elements, type) {
  let filteredElements = elements.filter((item) => item.type === type);
  let answers = [];
  filteredElements.forEach((element) => {
    if (type === "MULTIPLE_CHOICE") {
      answers.push(element.answers[element.correctAnswerIndex].text);
    } else if (type === "SELECT_PHRASE") {
      answers.push(element.answers[element.correctAnswerIndex]);
    } else if (type === "POINT_TO_PHRASE") {
      let selectableTranscript = element.transcriptParts.filter(
        (item) => item.selectable === true,
      );
      answers.push(selectableTranscript[element.correctAnswerIndex].text);
    } else if (type === "MATCH") {
      element.matches.forEach((m) => {
        answers.push([m.phrase, m.translation]);
      });
    } else if (type === "ARRANGE") {
      console.log("arragne");
      let tempanswers = element.phraseOrder;
      let phrases = element.selectablePhrases;
      for (var i = 0; i < tempanswers.length; i++) {
        tempanswers[i] = phrases[tempanswers[i]];
      }
      answers.push(tempanswers);
    } else if (type === "GAP_FILL") {
      let tempanswers = [];
      element.correctIndices.forEach((i) => {
        answers.push(element.choices[i]);
      });
    }
  });
  console.log(answers);
  return answers;
}
