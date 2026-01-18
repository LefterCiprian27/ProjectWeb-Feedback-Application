import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import sequelize from "./db.js";
import User from "./models/User.js";
import Activity from "./models/Activity.js";
import Feedback from "./models/Feedback.js";

import authRoutes from "./routes/authRoutes.js";
import activityRoutes from "./routes/activityRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import externalRoutes from "./routes/externalRoutes.js";

dotenv.config();

User.hasMany(Activity, { foreignKey: "professorId" });
Activity.belongsTo(User, { foreignKey: "professorId" });

User.hasMany(Feedback, { foreignKey: "userId" });
Feedback.belongsTo(User, { foreignKey: "userId" });

Activity.hasMany(Feedback, { foreignKey: "code", sourceKey: "code" });
Feedback.belongsTo(Activity, { foreignKey: "code", targetKey: "code" });

function nowMs() {
  return Date.now();
}

function isActive(a) {
  const t = nowMs();
  return t >= Number(a.startsAt) && t <= Number(a.endsAt);
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/external", externalRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  let user = null;

  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      user = null;
    }
  }

  socket.on("joinActivity", async ({ code }) => {
    const c = String(code || "").toUpperCase();
    const act = await Activity.findByPk(c);
    if (!act) return socket.emit("errorMessage", { error: "Activity not found" });

    const role = user?.role || "student";

    if (role === "student" && !isActive(act)) {
      return socket.emit("errorMessage", {
        error: "Activity is not active (students can join only during the time window)"
      });
    }

    socket.join(`activity:${c}`);
    socket.emit("joined", { code: c, role });
  });

  socket.on("sendReaction", async ({ code, type }) => {
    if (!user) return socket.emit("errorMessage", { error: "Not authenticated" });
    if (user.role !== "student") return socket.emit("errorMessage", { error: "Only students can rate" });

    const c = String(code || "").toUpperCase();
    const act = await Activity.findByPk(c);
    if (!act) return socket.emit("errorMessage", { error: "Activity not found" });
    if (!isActive(act)) return socket.emit("errorMessage", { error: "Activity is not active" });

    const allowed = new Set(["happy", "sad", "surprised", "confused"]);
    if (!allowed.has(type)) return;

    const ts = nowMs();

    try {
      await Feedback.create({ code: c, type, ts, userId: user.id });
    } catch (e) {
      return socket.emit("errorMessage", { error: "You already reacted to this activity." });
    }

    io.to(`activity:${c}`).emit("newReaction", { code: c, type, ts });
  });
});

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start();
