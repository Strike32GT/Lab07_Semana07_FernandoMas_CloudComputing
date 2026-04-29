require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./db");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");

const app = express();
const port = Number(process.env.PORT || 8080);
const instanceName = process.env.INSTANCE_NAME || "backend";

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("X-Instance-Id", instanceName);
  next();
});

app.use(express.static(path.join(__dirname, "..", "public")));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    return res.json({ ok: true, instance: instanceName });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message, instance: instanceName });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Servidor ${instanceName} escuchando en puerto ${port}`);
});
