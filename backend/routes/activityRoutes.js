import express from "express";
import Activity from "../models/Activity.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();

function nowMs() { return Date.now(); }
function isActive(a) {
  const t = nowMs();
  return t >= Number(a.startsAt) && t <= Number(a.endsAt);
}
function makeCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

router.post("/", async (req, res) => {
  try {
    const { title, description, startsAt, endsAt } = req.body;

    if (!title || !description || !startsAt || !endsAt) {
      return res.status(400).json({ error: "Missing fields: title, description, startsAt, endsAt" });
    }

    const s = Number(startsAt);
    const e = Number(endsAt);

    if (!Number.isFinite(s) || !Number.isFinite(e) || s >= e) {
      return res.status(400).json({ error: "Invalid startsAt/endsAt" });
    }

    let code;
    while (true) {
      code = makeCode(6);
      const existing = await Activity.findByPk(code);
      if (!existing) break;
    }

    const createdAt = nowMs();
    const act = await Activity.create({ code, title, description, startsAt: s, endsAt: e, createdAt });

    res.json({ ...act.toJSON(), active: isActive(act) });
  } catch {
    res.status(500).json({ error: "Server error creating activity" });
  }
});

router.get("/", async (req, res) => {
  try {
    const acts = await Activity.findAll({ order: [["createdAt", "DESC"]] });
    const result = [];

    for (const a of acts) {
      const count = await Feedback.count({ where: { code: a.code } });
      result.push({ ...a.toJSON(), active: isActive(a), feedbackCount: count });
    }

    res.json(result);
  } catch {
    res.status(500).json({ error: "Server error listing activities" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const act = await Activity.findByPk(code);
    if (!act) return res.status(404).json({ error: "Activity not found" });
    res.json({ ...act.toJSON(), active: isActive(act) });
  } catch {
    res.status(500).json({ error: "Server error reading activity" });
  }
});

export default router;
