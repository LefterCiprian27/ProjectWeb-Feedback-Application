import express from "express";

const router = express.Router();

router.get("/quote", async (req, res) => {
  try {
    const r = await fetch("https://api.quotable.io/random");
    if (!r.ok) return res.status(502).json({ error: "External service failed" });
    const data = await r.json();
    res.json({ content: data.content, author: data.author });
  } catch {
    res.status(502).json({ error: "External service failed" });
  }
});

export default router;
