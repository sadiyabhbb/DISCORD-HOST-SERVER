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

let bots = fs.readJSONSync(DATA_FILE, { throws: false }) || [];

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "bots/"),
  filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Store running child processes
const processes = {};

// Save bots.json
function saveBots() {
  fs.writeJSONSync(DATA_FILE, bots, { spaces: 2 });
}

// API: Upload bot
app.post("/bots/add", upload.single("file"), (req, res) => {
  const name = req.body.name || req.file.originalname;
  const id = Date.now().toString();
  const bot = {
    id,
    name,
    filename: req.file.filename,
    status: "Stopped",
    uptime: "0d 0h 0m",
    logs: []
  };
  bots.push(bot);
  saveBots();
  res.json({ success: true, bot });
});

// API: Start bot
app.post("/bots/start/:id", (req, res) => {
  const bot = bots.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  if (processes[bot.id]) return res.json({ message: "Bot already running" });

  const child = spawn("node", [path.join(__dirname, "bots", bot.filename)]);
  processes[bot.id] = child;
  bot.status = "Online";
  bot.startTime = Date.now();
  saveBots();

  child.stdout.on("data", data => {
    bot.logs.push(data.toString());
    saveBots();
  });

  child.stderr.on("data", data => {
    bot.logs.push("ERROR: " + data.toString());
    saveBots();
  });

  child.on("exit", () => {
    bot.status = "Stopped";
    delete processes[bot.id];
    saveBots();
  });

  res.json({ success: true, message: `Bot ${bot.name} started` });
});

// API: Stop bot
app.post("/bots/stop/:id", (req, res) => {
  const bot = bots.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });

  const proc = processes[bot.id];
  if (!proc) return res.json({ message: "Bot not running" });

  proc.kill();
  res.json({ success: true, message: `Bot ${bot.name} stopped` });
});

// API: List bots
app.get("/bots", (req, res) => {
  // Update uptime
  bots.forEach(bot => {
    if (bot.status === "Online" && bot.startTime) {
      const diff = Date.now() - bot.startTime;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      bot.uptime = `0d ${h}h ${m}m`;
    }
  });
  saveBots();
  res.json(bots);
});

// API: Fetch logs
app.get("/bots/logs/:id", (req, res) => {
  const bot = bots.find(b => b.id === req.params.id);
  if (!bot) return res.status(404).json({ error: "Bot not found" });
  res.json(bot.logs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
