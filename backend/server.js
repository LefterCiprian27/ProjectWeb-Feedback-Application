import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";

import sequelize from "./db.js";
import Activity from "./models/Activity.js";
import Feedback from "./models/Feedback.js";

import activityRoutes from "./routes/activityRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import externalRoutes from "./routes/externalRoutes.js";

dotenv.config();

Activity.hasMany(Feedback, { foreignKey: "code", sourceKey: "code" });
Feedback.belongsTo(Activity, { foreignKey: "code", targetKey: "code" });

function nowMs() { return Date.now(); }
function isActive(a) {
  const t = nowMs();
  return t >= Number(a.startsAt) && t <= Number(a.endsAt);
}

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/activities", activityRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/external", externalRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  socket.on("joinActivity", async ({ code, role }) => {
    const c = String(code || "").toUpperCase();
    const act = await Activity.findByPk(c);
    if (!act) return socket.emit("errorMessage", { error: "Activity not found" });

    const r = String(role || "student").toLowerCase();
    if (r === "student" && !isActive(act)) {
      return socket.emit("errorMessage", { error: "Activity is not active (students can join only during the time window)" });
    }

    socket.join(`activity:${c}`);
    socket.emit("joined", { code: c });
  });

  socket.on("sendReaction", async ({ code, type }) => {
    const c = String(code || "").toUpperCase();
    const act = await Activity.findByPk(c);
    if (!act) return socket.emit("errorMessage", { error: "Activity not found" });
    if (!isActive(act)) return socket.emit("errorMessage", { error: "Activity is not active" });

    const allowed = new Set(["happy", "sad", "surprised", "confused"]);
    if (!allowed.has(type)) return;

    const item = { code: c, type, ts: nowMs() };
    await Feedback.create(item);

    io.to(`activity:${c}`).emit("newReaction", { code: c, type: item.type, ts: item.ts });
  });
});

const PORT = Number(process.env.PORT || 3001);

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  server.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
}

start();
