const botsList = document.getElementById("botsList");
const uploadForm = document.getElementById("uploadForm");

async function fetchBots() {
  const res = await fetch("/bots");
  const bots = await res.json();
  botsList.innerHTML = bots.map(bot => `
    <div class="botCard">
      <strong>${bot.name}</strong> [${bot.status}]<br>
      <button class="startBtn" onclick="startBot('${bot.file}')">Start</button>
      <button class="stopBtn" onclick="stopBot('${bot.file}')">Stop</button>
      <pre>${bot.logs.slice(-10).join("")}</pre>
    </div>
  `).join("");
}

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const formData = new FormData(uploadForm);
  await fetch("/upload", { method: "POST", body: formData });
  uploadForm.reset();
  fetchBots();
});

async function startBot(file) {
  await fetch("/start", { method: "POST", headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filename: file }) });
  fetchBots();
}

async function stopBot(file) {
  await fetch("/stop", { method: "POST", headers: {'Content-Type':'application/json'}, body: JSON.stringify({ filename: file }) });
  fetchBots();
}

// Initial load
fetchBots();
setInterval(fetchBots, 5000); // refresh every 5s
