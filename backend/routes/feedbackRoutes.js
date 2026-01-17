import express from "express";
import Activity from "../models/Activity.js";
import Feedback from "../models/Feedback.js";

const router = express.Router();

router.get("/:code", async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const act = await Activity.findByPk(code);
    if (!act) return res.status(404).json({ error: "Activity not found" });

    const items = await Feedback.findAll({
      where: { code },
      order: [["ts", "ASC"]],
      attributes: ["type", "ts"]
    });

    res.json(items);
  } catch {
    res.status(500).json({ error: "Server error reading feedback" });
  }
});

export default router;
