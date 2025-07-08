const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";

let qaList = [];
let logQueue = [];
let shouldSpeak = false;
let micEnabled = true;
let recognition = null;
let isRecognizing = false;
let currentCategory = "All";

function similarity(a, b) {
  const common = a.split(" ").filter(w => b.includes(w)).length;
  return (common * 2) / (a.split(" ").length + b.split(" ").length) * 100;
}

function fuzzyMatch(input) {
  input = input.toLowerCase().trim();
  let best = { score: 0, question: null, answer: null };
  qaList.forEach(row => {
    if (currentCategory !== "All" && row.Category !== currentCategory) return;
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
  const repeatStatusEl = document.getElementById("repeatStatus");

  const isRepeat = logQueue.some(log => log.q === matchedQ);
  repeatStatusEl.textContent = isRepeat ? "🔁 Repeated Question" : "🆕 New Question";
  repeatStatusEl.style.color = isRepeat ? "orange" : "#00ff88";
  repeatStatusEl.classList.remove("show");
  void repeatStatusEl.offsetWidth;
  repeatStatusEl.classList.add("show");

  if (isRepeat) return;

  // Mark all old blocks
  [...logEl.children].forEach(block => block.classList.add("old"));

  const block = document.createElement("div");
  block.className = "block";
  block.innerHTML = `
    <p><strong>👂 Heard:</strong> ${original}</p>
    <p class="matched">🔍 Matched: ${matchedQ}</p>
    <p class="answer">📘 Answer: ${answer}</p>
  `;
  logEl.prepend(block);

  logQueue.unshift({ q: matchedQ });
  if (logQueue.length > 3) {
    logQueue.pop();
    if (logEl.children.length > 3) {
      logEl.removeChild(logEl.lastChild);
    }
  }

  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function startListening() {
  if (isRecognizing || !micEnabled) return;

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

  recognition.onerror = e => {
    console.warn("🎤 Error:", e.error);
    recognition.stop();
  };

  recognition.onend = () => {
    isRecognizing = false;
    if (micEnabled) setTimeout(startListening, 1000);
  };

  recognition.start();
}

function stopListening() {
  if (recognition) recognition.stop();
  isRecognizing = false;
}

function loadQA() {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      populateCategories();
      startListening();
    })
    .catch(err => console.error("❌ Failed to fetch Q&A", err));
}

function populateCategories() {
  const categoryFilter = document.getElementById("categoryFilter");
  const categories = [...new Set(qaList.map(q => q.Category))];
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryFilter.appendChild(opt);
  });

  categoryFilter.addEventListener("change", e => {
    currentCategory = e.target.value;
  });
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("speakToggle").addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });

  document.getElementById("themeToggle").addEventListener("change", e => {
    document.body.classList.toggle("light");
  });

  document.getElementById("micToggle").addEventListener("change", e => {
    micEnabled = e.target.checked;
    if (micEnabled) {
      startListening();
    } else {
      stopListening();
    }
  });

  document.getElementById("clearLog").addEventListener("click", () => {
    logQueue = [];
    document.getElementById("log").innerHTML = "";
    document.getElementById("repeatStatus").textContent = "🧹 Log cleared";
    document.getElementById("repeatStatus").style.color = "gray";
  });

  loadQA();
});
