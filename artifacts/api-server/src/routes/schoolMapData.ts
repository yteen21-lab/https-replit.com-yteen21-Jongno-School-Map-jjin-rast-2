import { Router, type IRouter } from "express";
import fs from "fs";
import path from "path";

const router: IRouter = Router();

const DATA_DIR  = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "school-map-data.json");

interface SharedData {
  schools: unknown[];
  tobacco: unknown[];
  savedAt: string;
}

function loadData(): SharedData | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as SharedData;
  } catch {
    return null;
  }
}

function saveData(data: SharedData): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

router.get("/school-map-data", (_req, res) => {
  const data = loadData();
  if (!data) {
    res.status(404).json({ error: "No shared data yet" });
    return;
  }
  res.json(data);
});

router.post("/school-map-data", (req, res) => {
  const body = req.body as Partial<SharedData>;
  if (!Array.isArray(body.schools) || !Array.isArray(body.tobacco)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }
  const data: SharedData = {
    schools: body.schools,
    tobacco: body.tobacco,
    savedAt: new Date().toISOString(),
  };
  saveData(data);
  res.json({ ok: true, savedAt: data.savedAt });
});

export default router;
