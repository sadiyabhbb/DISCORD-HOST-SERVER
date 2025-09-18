const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data/bots.json");
const BOTS_FOLDER = path.join(__dirname, "bots");
fs.ensureFileSync(DATA_FILE);

// Load bots.json
function loadBots() {
  try {
    return fs.readJSONSync(DATA_FILE);
  } catch {
    return [];
  }
}

// Save bots.json
function saveBots(bots) {
  fs.writeJSONSync(DATA_FILE, bots, { spaces: 2 });
}

// Run all bots
function runBots() {
  const botFiles = fs.readdirSync(BOTS_FOLDER).filter(f => f.endsWith(".js"));

  botFiles.forEach(file => {
    const filePath = path.join(BOTS_FOLDER, file);
    const botProcess = spawn("node", [filePath]);

    botProcess.stdout.on("data", data => {
      console.log(`[${file}] stdout: ${data}`);
      const bots = loadBots();
      const bot = bots.find(b => b.file === file);
      if (bot) bot.logs = bot.logs || [];
      if (bot) bot.logs.push(data.toString());
      saveBots(bots);
    });

    botProcess.stderr.on("data", data => {
      console.error(`[${file}] stderr: ${data}`);
    });

    botProcess.on("close", code => {
      console.log(`[${file}] exited with code ${code}`);
    });
  });
}

// API to get bots
app.get("/bots", (req, res) => {
  const bots = loadBots();
  res.json(bots);
});

// API to add bot manually
app.post("/bots/add", (req, res) => {
  const { name, file } = req.body;
  if (!name || !file) return res.status(400).json({ error: "name & file required" });

  const bots = loadBots();
  bots.push({
    name,
    file,
    status: "Stopped",
    addedTime: Date.now(),
    logs: []
  });
  saveBots(bots);
  res.json({ success: true });
});

// Start server and run bots
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runBots();  // run all bots on server start
});
