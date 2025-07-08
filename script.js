const apiURL = "https://script.google.com/macros/s/AKfycbzpewxrflhfwpk3fDlyE6y-cNqEVfk1XRecioxe6lPtPgeebz5LHaOteu5hv2lIjRnuXg/exec";
let qaList = [];
let shouldSpeak = true;
let recognition = null;
let isRecognizing = false;
let recentQuestions = [];
let micEnabled = true;

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
  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const recentOnlyQuestions = recentQuestions.map(q => q.question);
  const isRepeat = recentOnlyQuestions.includes(matchedQ);

  if (!isRepeat || recentOnlyQuestions.length >= 3) {
    if (!isRepeat) {
      recentQuestions.unshift({ question: matchedQ, original, answer, timestamp });
      if (recentQuestions.length > 3) recentQuestions.pop();
    }

    logEl.innerHTML = "";
    recentQuestions.forEach((entry, index) => {
      const block = document.createElement("div");
      block.className = "block";
      const isLatest = index === 0;
      block.innerHTML = `
        <p><strong>🕒</strong> ${entry.timestamp}</p>
        <p><strong>👂 Heard:</strong> ${entry.original}</p>
        <p style="font-size: ${isLatest ? '1rem' : '0.9rem'}; color: gray;">
          <strong>🔍 Matched:</strong> ${entry.question}
        </p>
        <p style="font-size: ${isLatest ? '1.8rem' : '1rem'}; color: ${isLatest ? 'cyan' : '#aaa'};">
          <strong>📘 Answer:</strong> ${entry.answer}
        </p>
        ${entry.flagged ? `<p style="color: orange;">⚠️ Repeated Question</p>` : ""}
      `;
      logEl.appendChild(block);
    });

    speak(`Question: ${matchedQ}. Answer: ${answer}`);
  } else {
    recentQuestions[0].flagged = true;
    displayLog(original, matchedQ, answer);
  }
}

function startListening() {
  if (isRecognizing || !("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) return;

  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecognizing = true;
    console.log("🎤 Listening...");
  };

  recognition.onresult = e => {
    if (!micEnabled) return;
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

// Event setup
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("speakToggle").addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });

  document.getElementById("themeToggle").addEventListener("change", () => {
    document.body.classList.toggle("light");
  });

  document.getElementById("clearLog").addEventListener("click", () => {
    document.getElementById("log").innerHTML = "";
    recentQuestions = [];
  });

  document.getElementById("micToggle").addEventListener("click", e => {
    micEnabled = !micEnabled;
    e.target.textContent = micEnabled ? "🎤 Mic Off" : "🎤 Mic On";
  });

  loadQA();
});
