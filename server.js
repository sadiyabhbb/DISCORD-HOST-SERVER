const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const cors = require("cors");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data/bots.json");
fs.ensureFileSync(DATA_FILE);

let runningBots = {}; // Track running child processes

// Multer setup for bot file uploads
const upload = multer({ dest: "bots/" });

// Load & save bot info
function loadBots() {
  try {
    return fs.readJSONSync(DATA_FILE);
  } catch {
    return [];
  }
}
function saveBots(bots) {
  fs.writeJSONSync(DATA_FILE, bots, { spaces: 2 });
}

// Upload bot
app.post("/upload", upload.single("bot"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const bots = loadBots();
  bots.push({
    name: req.body.name || req.file.originalname,
    file: req.file.filename,
    status: "Stopped",
    addedTime: Date.now(),
    logs: []
  });
  saveBots(bots);
  res.json({ success: true, message: "Bot uploaded", bot: bots[bots.length - 1] });
});

// List bots
app.get("/bots", (req, res) => {
  const bots = loadBots();
  res.json(bots);
});

// Start bot
app.post("/start", (req, res) => {
  const { filename } = req.body;
  const bots = loadBots();
  const bot = bots.find(b => b.file === filename);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  if (runningBots[filename]) return res.json({ message: "Bot already running" });

  const child = spawn("node", [`bots/${filename}`], { stdio: ["pipe", "pipe", "pipe"] });

  child.stdout.on("data", data => {
    bot.logs.push(data.toString());
    saveBots(bots);
  });
  child.stderr.on("data", data => {
    bot.logs.push("ERR: " + data.toString());
    saveBots(bots);
  });
  child.on("close", code => {
    bot.status = "Stopped";
    saveBots(bots);
    delete runningBots[filename];
  });

  bot.status = "Running";
  saveBots(bots);
  runningBots[filename] = child;

  res.json({ success: true, message: "Bot started" });
});

// Stop bot
app.post("/stop", (req, res) => {
  const { filename } = req.body;
  const child = runningBots[filename];
  if (!child) return res.status(404).json({ error: "Bot not running" });

  child.kill();
  res.json({ success: true, message: "Bot stopped" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot Hosting Dashboard running on port ${PORT}`));
