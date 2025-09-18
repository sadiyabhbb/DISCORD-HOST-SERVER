const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "data/bots.json");
fs.ensureFileSync(DATA_FILE);

const BOT_FOLDER = path.join(__dirname, "bots");
fs.ensureDirSync(BOT_FOLDER);

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, BOT_FOLDER),
    filename: (req, file, cb) => cb(null, file.originalname)
});
const upload = multer({ storage });

// Load bots
function loadBots() {
    try { return fs.readJSONSync(DATA_FILE); }
    catch { return []; }
}

// Save bots
function saveBots(bots) { fs.writeJSONSync(DATA_FILE, bots, { spaces: 2 }); }

// Upload bot files
app.post("/upload", upload.array("files"), (req, res) => {
    const botName = req.body.name || req.files[0].originalname.split(".")[0];
    let bots = loadBots();
    if (!bots.find(b => b.name === botName)) bots.push({ name: botName, folder: botName });
    saveBots(bots);
    res.json({ success: true, message: `Bot ${botName} uploaded.` });
});

// List bots
app.get("/bots", (req, res) => {
    res.json(loadBots());
});

// Run bot
app.post("/start", (req, res) => {
    const { name, entryFile } = req.body;
    const botPath = path.join(BOT_FOLDER, name, entryFile);

    if (!fs.existsSync(botPath)) return res.status(404).json({ error: "Entry file not found" });

    const botProcess = spawn("node", [botPath], { cwd: path.dirname(botPath) });

    botProcess.stdout.on("data", data => console.log(`[${name}]`, data.toString()));
    botProcess.stderr.on("data", data => console.error(`[${name} ERROR]`, data.toString()));
    botProcess.on("close", code => console.log(`[${name}] exited with code ${code}`));

    res.json({ success: true, message: `Bot ${name} started.` });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
