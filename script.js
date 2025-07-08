const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";
let qaList = [];
let logQueue = [];
let shouldSpeak = false;
let recognition = null;
let isRecognizing = false;
let micOn = true;

function similarity(a, b) {
  const common = a.split(" ").filter(w => b.includes(w)).length;
  return (common * 2) / (a.split(" ").length + b.split(" ").length) * 100;
}

function fuzzyMatch(input) {
  input = input.toLowerCase().trim();
  let best = { score: 0, question: null, answer: null };
  qaList.forEach(row => {
    const q = row.Question.toLowerCase().trim();
    const score = similarity(input, q);
    if (score > best.score) {
      best = { score, question: row.Question, answer: row.Answer };
    }
  });
  return best.score > 40 ? best : null;
}

function speak(text) {
  if (!shouldSpeak) return;
  const utterance = new SpeechSynthesisUtterance(text);
  speechSynthesis.speak(utterance);
}

function displayLog(original, matchedQ, answer) {
  const logEl = document.getElementById("log");
  const isRepeat = logQueue.some(log => log.q === matchedQ);

  if (!isRepeat) {
    logQueue.unshift({ q: matchedQ });
  }

  const block = document.createElement("div");
  block.className = "block";

  const time = new Date().toLocaleTimeString();

  block.innerHTML = `
    <p><strong>👂 Heard:</strong> ${original}</p>
    <p class="question">🔍 Matched: ${matchedQ} ${isRepeat ? '<span class="repeat-flag">🔁 Repeated</span>' : ''}</p>
    <p class="answer">📘 ${answer}</p>
    <p class="timestamp">🕒 ${time}</p>
  `;

  logEl.prepend(block);

  while (logEl.children.length > 3) {
    logEl.removeChild(logEl.lastChild);
    logQueue.pop();
  }

  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function startListening() {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    alert("Speech recognition not supported!");
    return;
  }

  if (isRecognizing) return;

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizing = true;
    console.log("🎤 Mic ON...");
  };

  recognition.onresult = e => {
    if (!micOn) return;
    const transcript = e.results[e.results.length - 1][0].transcript;
    const match = fuzzyMatch(transcript);
    if (match) displayLog(transcript, match.question, match.answer);
  };

  recognition.onerror = (e) => {
    console.warn("🎤 Error:", e.error);
    recognition.stop();
  };

  recognition.onend = () => {
    isRecognizing = false;
    if (micOn) setTimeout(startListening, 1000);
  };

  recognition.start();
}

function stopListening() {
  if (recognition && isRecognizing) {
    recognition.stop();
    isRecognizing = false;
    console.log("🔇 Mic OFF...");
  }
}

function loadQA() {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      startListening();
    })
    .catch(err => console.error("❌ Failed to fetch Q&A", err));
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("themeToggle").addEventListener("change", e => {
    document.body.classList.toggle("light", e.target.checked);
  });

  document.getElementById("speakToggle").addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });

  document.getElementById("micToggle").addEventListener("change", e => {
    micOn = e.target.checked;
    if (micOn) {
      startListening();
    } else {
      stopListening();
    }
  });

  document.getElementById("clearLog").addEventListener("click", () => {
    document.getElementById("log").innerHTML = "";
    logQueue = [];
  });

  loadQA();
});
