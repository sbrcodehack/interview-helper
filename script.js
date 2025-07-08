const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";
let qaList = [];
let askedQuestions = new Set();
let shouldSpeak = true;
let recognition = null;
let isRecognizing = false;

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
  if (askedQuestions.has(matchedQ)) return;
  askedQuestions.add(matchedQ);

  const block = document.createElement("div");
  block.className = "block";
  block.innerHTML = `
    <p><strong>👂 Heard:</strong> ${original}</p>
    <p style="font-size: 1.6rem; color: cyan;"><strong>🔍 Matched:</strong> ${matchedQ}</p>
    <p><strong>📘 Answer:</strong> ${answer}</p>
  `;
  logEl.prepend(block);
  if (logEl.children.length > 3) logEl.removeChild(logEl.lastChild);

  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function startListening() {
  if (isRecognizing || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
    return;
  }

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizing = true;
    console.log("🎤 Listening...");
  };

  recognition.onresult = e => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    const match = fuzzyMatch(transcript);
    if (match) {
      displayLog(transcript, match.question, match.answer);
    }
  };

  recognition.onerror = (e) => {
    console.warn("🎤 Error:", e.error);
    recognition.stop();
  };

  recognition.onend = () => {
    isRecognizing = false;
    setTimeout(() => {
      startListening(); // restart after short delay
    }, 1500);
  };

  recognition.start();
}

function loadQA() {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      console.log("✅ Q&A Loaded", qaList);
      startListening();
    })
    .catch(err => console.error("❌ Failed to fetch Q&A", err));
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("speakToggle").addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });

  document.getElementById("themeToggle").addEventListener("change", e => {
    document.body.classList.toggle("light");
  });

  loadQA();
});
