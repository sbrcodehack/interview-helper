const apiURL = "https://script.google.com/macros/s/AKfycbwmnr7mQYFgAYBnyIxCDGuSDiHBwzXTjpszpKr1-4Sd6UDMlAktosjQZjvlGCwRyiwD/exec";
let qaList = [];
let askedQuestions = new Set();
let shouldSpeak = true;

function similarity(a, b) {
  const common = a.split(" ").filter(w => b.includes(w)).length;
  return (common * 2) / (a.split(" ").length + b.split(" ").length) * 100;
}

function fuzzyMatch(input, categoryFilter) {
  input = input.toLowerCase().trim();
  let best = { score: 0, question: null, answer: null };
  const selectedCategory = categoryFilter.value;

  qaList.forEach(row => {
    if (selectedCategory !== "All" && row.Category !== selectedCategory) return;
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

function displayLog(logEl, original, matchedQ, answer) {
  if (askedQuestions.has(matchedQ)) return;
  askedQuestions.add(matchedQ);

  const block = document.createElement("div");
  block.className = "bg-gray-700 dark:bg-gray-200 p-4 rounded border-l-4 border-green-400";
  block.innerHTML = `
    <p class="text-green-300 dark:text-green-700 font-semibold">👂 Heard: ${original}</p>
    <p class="text-blue-300 dark:text-blue-700">🔍 Matched: ${matchedQ}</p>
    <p class="text-white dark:text-black">📘 Answer: ${answer}</p>
  `;
  logEl.prepend(block);
  if (logEl.children.length > 3) logEl.removeChild(logEl.lastChild);

  speak(`Question: ${matchedQ}. Answer: ${answer}`);
}

function startListening(logEl, categoryFilter) {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = e => {
    const transcript = e.results[e.results.length - 1][0].transcript;
    const match = fuzzyMatch(transcript, categoryFilter);
    if (match) {
      displayLog(logEl, transcript, match.question, match.answer);
    }
  };

  recognition.start();
  console.log("🎤 Listening...");
}

function clearHistory(logEl) {
  askedQuestions.clear();
  logEl.innerHTML = "";
}

function loadCategories(qaList, categoryFilter) {
  const categories = [...new Set(qaList.map(row => row.Category))];
  categoryFilter.innerHTML = '<option value="All">All</option>';
  categories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });
}

function loadQA(logEl, categoryFilter) {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      console.log("✅ Loaded Q&A", qaList);
      loadCategories(qaList, categoryFilter);
    })
    .catch(err => console.error("❌ Failed to fetch Q&A", err));
}

window.addEventListener("DOMContentLoaded", () => {
  const logEl = document.getElementById("log");
  const categoryFilter = document.getElementById("categoryFilter");
  const speakToggle = document.getElementById("speakToggle");

  loadQA(logEl, categoryFilter);

  document.getElementById("startListening").addEventListener("click", () =>
    startListening(logEl, categoryFilter)
  );

  document.getElementById("clearHistory").addEventListener("click", () =>
    clearHistory(logEl)
  );

  speakToggle.addEventListener("change", e => {
    shouldSpeak = e.target.checked;
  });
});
