import express from "express";
import { Op } from "sequelize";
import Activity from "../models/Activity.js";
import Feedback from "../models/Feedback.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = express.Router();

function nowMs() {
  return Date.now();
}

function isActive(a) {
  const t = nowMs();
  return t >= Number(a.startsAt) && t <= Number(a.endsAt);
}

function makeCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function generateUniqueCode() {
  while (true) {
    const code = makeCode(6);
    const existing = await Activity.findByPk(code);
    if (!existing) return code;
  }
}

router.get("/", requireAuth, async (req, res) => {
  try {
    if (req.user.role === "professor") {
      const acts = await Activity.findAll({ where: { professorId: req.user.id } });

      const data = await Promise.all(
        acts.map(async (a) => {
          const feedbackCount = await Feedback.count({ where: { code: a.code } });
          return {
            code: a.code,
            title: a.title,
            description: a.description,
            startsAt: Number(a.startsAt),
            endsAt: Number(a.endsAt),
            active: isActive(a),
            feedbackCount
          };
        })
      );

      return res.json(data);
    }

    const rows = await Feedback.findAll({
      attributes: ["code"],
      where: { userId: req.user.id },
      group: ["code"]
    });

    const codes = rows.map((r) => r.code);
    if (codes.length === 0) return res.json([]);

    const acts = await Activity.findAll({ where: { code: { [Op.in]: codes } } });

    const data = await Promise.all(
      acts.map(async (a) => {
        const myFeedbackCount = await Feedback.count({ where: { code: a.code, userId: req.user.id } });
        return {
          code: a.code,
          title: a.title,
          description: a.description,
          startsAt: Number(a.startsAt),
          endsAt: Number(a.endsAt),
          active: isActive(a),
          myFeedbackCount
        };
      })
    );

    return res.json(data);
  } catch (e) {
    console.error("LIST ACTIVITIES ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:code", async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase();
    const a = await Activity.findByPk(code);
    if (!a) return res.status(404).json({ error: "Activity not found" });

    const feedbackCount = await Feedback.count({ where: { code } });

    res.json({
      code: a.code,
      title: a.title,
      description: a.description,
      startsAt: Number(a.startsAt),
      endsAt: Number(a.endsAt),
      active: isActive(a),
      feedbackCount
    });
  } catch (e) {
    console.error("GET ACTIVITY ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/", requireAuth, requireRole("professor"), async (req, res) => {
  try {
    const { title, description, startsAt, endsAt } = req.body;

    if (!title || !description || !startsAt || !endsAt) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const s = Number(startsAt);
    const e = Number(endsAt);

    if (!Number.isFinite(s) || !Number.isFinite(e)) {
      return res.status(400).json({ error: "Invalid dates" });
    }

    if (e <= s) {
      return res.status(400).json({ error: "End must be after start" });
    }

    const code = await generateUniqueCode();

    const created = await Activity.create({
      code,
      title: String(title),
      description: String(description),
      startsAt: s,
      endsAt: e,
      createdAt: Date.now(),
      professorId: req.user.id
    });

    res.status(201).json({
      code: created.code,
      title: created.title,
      description: created.description,
      startsAt: Number(created.startsAt),
      endsAt: Number(created.endsAt),
      active: isActive(created)
    });
  } catch (e) {
    console.error("CREATE ACTIVITY ERROR:", e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
