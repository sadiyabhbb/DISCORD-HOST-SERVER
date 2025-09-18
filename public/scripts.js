async function fetchBots() {
  const res = await fetch("/bots");
  const bots = await res.json();
  const list = document.getElementById("botList");
  list.innerHTML = "";
  bots.forEach(bot => {
    const li = document.createElement("li");
    li.textContent = bot.name;
    const startBtn = document.createElement("button");
    startBtn.textContent = "Start";
    startBtn.onclick = () => startBot(bot.name, "index.js"); // main entry
    li.appendChild(startBtn);
    list.appendChild(li);
  });
}

async function uploadBot() {
  const name = document.getElementById("botName").value;
  const files = document.getElementById("botFiles").files;
  if (!files.length) return alert("Select files first");

  const formData = new FormData();
  formData.append("name", name);
  for (let f of files) formData.append("files", f);

  const res = await fetch("/upload", { method: "POST", body: formData });
  const data = await res.json();
  alert(data.message);
  fetchBots();
}

async function startBot(name, entryFile) {
  const res = await fetch("/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, entryFile })
  });
  const data = await res.json();
  alert(data.message);
}

fetchBots();
