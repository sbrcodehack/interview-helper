const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";

let qaList = [];
let askedLog = []; // Now stores objects: { question, timestamp }
let shouldSpeak = false;
let micOn = false;
let recognition;

function similarity(a, b) {
  const common = a.split(" ").filter(w => b.includes(w)).length;
  return (common * 2) / (a.split(" ").length + b.split(" ").length) * 100;
}

function fuzzyMatch(input, category) {
  input = input.toLowerCase().trim();
  let best = { score: 0, question: null, answer: null };
  qaList.forEach(row => {
    if (category !== "All" && row.Category !== category) return;
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

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function displayLog(original, matchedQ, answer) {
  const logEl = document.getElementById("log");
  const category = document.getElementById("categorySelect").value;
  const mode = document.getElementById("modeSelect").value;

  const now = Date.now();
  const existingIndex = askedLog.findIndex(entry => entry.question === matchedQ);
  const isRepeat = existingIndex !== -1;

  if (isRepeat && now - askedLog[existingIndex].timestamp < 60000) {
    // Still update UI to show it's a repeat, but don't add to askedLog
  } else {
    const newEntry = { question: matchedQ, timestamp: now };
    if (isRepeat) askedLog.splice(existingIndex, 1);
    askedLog.unshift(newEntry);
    if (askedLog.length > 10) askedLog.pop();
  }

  const block = document.createElement("div");
  block.className = "block latest";
  if (isRepeat) block.classList.add("repeat");

  block.innerHTML = `
    <p><strong>⏱️ ${getTime()}</strong></p>
    <p><strong>👂 Heard:</strong> ${original}</p>
    <p class="question"><strong>🔍 Matched:</strong> ${matchedQ}</p>
    <p class="answer" style="font-size: 1.3rem;"><strong>📘 Answer:</strong> ${answer}</p>
    ${isRepeat ? '<p class="repeat">⚠️ Repeated Question (within last 60s)</p>' : ""}
    ${mode === "Live Interview" ? '<div class="repeat">🔴 LIVE INTERVIEW MODE</div>' : ""}
  `;

  const logs = logEl.querySelectorAll(".block");
  logs.forEach(l => l.classList.remove("latest"));
  if (logs.length >= 3) logs[2].remove();

  logEl.prepend(block);
  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function startRecognition() {
  if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = e => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    const category = document.getElementById("categorySelect").value;
    const match = fuzzyMatch(transcript, category);
    if (match) displayLog(transcript, match.question, match.answer);
  };

  recognition.onerror = e => {
    console.warn("Mic Error:", e.error);
    recognition.stop();
  };

  recognition.onend = () => {
    if (micOn) setTimeout(() => recognition.start(), 1000);
  };

  recognition.start();
}

function toggleMic() {
  const status = document.getElementById("status");
  const micBtn = document.getElementById("micToggle");
  micOn = !micOn;
  if (micOn) {
    status.textContent = "🎤 Mic is ON";
    micBtn.textContent = "🔇 Mic Off";
    startRecognition();
  } else {
    status.textContent = "Mic is OFF";
    micBtn.textContent = "🎤 Mic On";
    if (recognition) recognition.stop();
  }
}

function loadQA() {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      const categorySelect = document.getElementById("categorySelect");
      const categories = new Set(["All"]);
      data.forEach(row => categories.add(row.Category));
      categorySelect.innerHTML = "";
      categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
      });
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

  document.getElementById("micToggle").addEventListener("click", toggleMic);

  document.getElementById("clearLog").addEventListener("click", () => {
    document.getElementById("log").innerHTML = "";
    askedLog = [];
  });

  loadQA();
});
