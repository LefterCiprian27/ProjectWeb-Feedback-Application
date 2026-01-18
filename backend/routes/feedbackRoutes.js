import express from "express";
import Activity from "../models/Activity.js";
import Feedback from "../models/Feedback.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/mine/summary", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "student") return res.status(403).json({ error: "Forbidden" });

    const rows = await Feedback.findAll({
      where: { userId: req.user.id },
      attributes: ["code", "type", "ts"],
      order: [["ts", "DESC"]]
    });

    const map = {};
    for (const r of rows) {
      map[r.code] = { code: r.code, type: r.type, ts: Number(r.ts) };
    }

    res.json(Object.values(map));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:code", requireAuth, async (req, res) => {
  try {
    const code = String(req.params.code || "").toUpperCase();

    const act = await Activity.findByPk(code);
    if (!act) return res.status(404).json({ error: "Activity not found" });

    if (req.user.role === "professor") {
      if (Number(act.professorId) !== Number(req.user.id)) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const items = await Feedback.findAll({
        where: { code },
        attributes: ["type", "ts"],
        order: [["ts", "ASC"]]
      });

      return res.json(items);
    }

    const items = await Feedback.findAll({
      where: { code, userId: req.user.id },
      attributes: ["type", "ts"],
      order: [["ts", "ASC"]]
    });

    return res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
