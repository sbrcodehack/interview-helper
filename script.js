const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";
let qaList = [];
let askedQuestions = new Set();
let shouldSpeak = true;
let recognition = null;
let isRecognizing = false;
let previousLogs = [];

const micStatus = document.getElementById("micStatus");

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

  previousLogs.unshift({ original, matchedQ, answer });
  if (previousLogs.length > 4) previousLogs.pop();

  logEl.innerHTML = '';
  previousLogs.forEach((entry, index) => {
    const block = document.createElement("div");
    block.className = "block";
    if (index === 0) {
      block.innerHTML = `
        <p><strong>👂 Heard:</strong> ${entry.original}</p>
        <p style="font-size: 1.8rem; color: cyan;"><strong>🔍 Matched:</strong> ${entry.matchedQ}</p>
        <p style="font-size: 1.2rem;"><strong>📘 Answer:</strong> ${entry.answer}</p>
      `;
    } else {
      block.innerHTML = `
        <p><strong>👂</strong> ${entry.original}</p>
        <p style="font-size: 1rem; color: gray;"><strong>🔍</strong> ${entry.matchedQ}</p>
        <p style="font-size: 0.9rem;"><strong>📘</strong> ${entry.answer}</p>
      `;
    }
    logEl.appendChild(block);
  });

  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function resetLogs() {
  const logEl = document.getElementById("log");
  logEl.innerHTML = '';
  previousLogs = [];
  askedQuestions.clear();
}

function updateMicIcon(active = true) {
  micStatus.textContent = active ? '🎤' : '🔇';
  micStatus.style.color = active ? 'limegreen' : 'red';
}

function startListening() {
  if (isRecognizing || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizing = true;
    updateMicIcon(true);
  };

  recognition.onresult = e => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    const match = fuzzyMatch(transcript);
    if (match && !askedQuestions.has(match.question)) {
      displayLog(transcript, match.question, match.answer);
    }
  };

  recognition.onerror = e => {
    console.warn("Mic error:", e.error);
    updateMicIcon(false);
    recognition.stop();
  };

  recognition.onend = () => {
    isRecognizing = false;
    updateMicIcon(false);
    setTimeout(startListening, 1000);
  };

  recognition.start();
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
  document.getElementById("speakToggle").addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });

  document.getElementById("themeToggle").addEventListener("change", e => {
    document.body.classList.toggle("light");
  });

  document.getElementById("resetBtn").addEventListener("click", resetLogs);

  loadQA();
});
