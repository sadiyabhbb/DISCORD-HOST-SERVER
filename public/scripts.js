const uploadForm = document.getElementById("uploadForm");
const botList = document.getElementById("botList");
const consoleOutput = document.getElementById("consoleOutput");

async function fetchBots() {
  const res = await fetch("/bots");
  const bots = await res.json();
  botList.innerHTML = "";
  bots.forEach(bot => {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${bot.name}</strong> - ${bot.status} 
      <button onclick="startBot('${bot.id}')">Start</button>
      <button onclick="stopBot('${bot.id}')">Stop</button>
      <button onclick="showLogs('${bot.id}')">Logs</button>`;
    botList.appendChild(li);
  });
}

async function startBot(id) {
  await fetch(`/bots/start/${id}`, { method: "POST" });
  fetchBots();
}

async function stopBot(id) {
  await fetch(`/bots/stop/${id}`, { method: "POST" });
  fetchBots();
}

async function showLogs(id) {
  const res = await fetch(`/bots/logs/${id}`);
  const logs = await res.json();
  consoleOutput.textContent = logs.join("\n");
}

uploadForm.addEventListener("submit", async e => {
  e.preventDefault();
  const fileInput = document.getElementById("botFile");
  const botName = document.getElementById("botName").value;
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("name", botName);
  await fetch("/bots/add", { method: "POST", body: formData });
  fileInput.value = "";
  fetchBots();
});

// Initial load
fetchBots();
setInterval(fetchBots, 5000);
