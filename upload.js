const apiURL = "https://script.google.com/macros/s/AKfycbzoU-IBJGCUn705tJLP-5s8osDJmnbd_yiuhRzzA2Jfki-4M3S94b7cf5S0-gQE-IId2A/exec";
let qaList = [];

function fetchQA() {
  fetch(apiURL)
    .then(res => res.json())
    .then(data => {
      qaList = data;
      populateCategoryDropdown();
    })
    .catch(err => {
      document.getElementById("uploadStatus").textContent = "❌ Failed to load data";
      console.error(err);
    });
}

function populateCategoryDropdown() {
  const categories = new Set();
  qaList.forEach(q => categories.add(q.Category));
  const select = document.getElementById("uploadCategory");
  select.innerHTML = "";
  [...categories].sort().forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
  const optNew = document.createElement("option");
  optNew.value = "__new__";
  optNew.textContent = "➕ Add New Category";
  select.appendChild(optNew);

  select.addEventListener("change", () => {
    document.getElementById("newCategoryInput").style.display = select.value === "__new__" ? "block" : "none";
  });
}

function isDuplicate(question) {
  const lowerQ = question.toLowerCase().trim();
  return qaList.some(entry => entry.Question.toLowerCase().trim() === lowerQ);
}

function submitQuestion() {
  const catSelect = document.getElementById("uploadCategory");
  const newCatInput = document.getElementById("newCategoryInput");
  const question = document.getElementById("uploadQuestion").value.trim();
  const answer = document.getElementById("uploadAnswer").value.trim();
  const category = catSelect.value === "__new__" ? newCatInput.value.trim() : catSelect.value;

  const statusEl = document.getElementById("uploadStatus");
  statusEl.textContent = "";

  if (!category || !question || !answer) {
    statusEl.textContent = "⚠️ Please fill all fields.";
    return;
  }

  if (isDuplicate(question)) {
    statusEl.textContent = "⚠️ This question already exists.";
    return;
  }

  const payload = {
    method: "POST",
    body: JSON.stringify({ Category: category, Question: question, Answer: answer })
  };

  fetch(apiURL, payload)
    .then(res => res.text())
    .then(res => {
      statusEl.textContent = "✅ Uploaded successfully!";
      showHistory(category, question);
      document.getElementById("uploadQuestion").value = "";
      document.getElementById("uploadAnswer").value = "";
      if (catSelect.value === "__new__") newCatInput.value = "";
      fetchQA();
    })
    .catch(err => {
      console.error(err);
      statusEl.textContent = "❌ Upload failed.";
    });
}

function showHistory(category, question) {
  const log = document.getElementById("uploadHistory");
  const now = new Date().toLocaleTimeString();
  const line = document.createElement("p");
  line.textContent = `${now} | ✅ Added to '${category}': ${question}`;
  log.prepend(line);
  const items = log.querySelectorAll("p");
  if (items.length > 5) items[5].remove();
}

window.addEventListener("DOMContentLoaded", fetchQA);
