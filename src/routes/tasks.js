const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, title, description, created_at FROM tasks WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );

    return res.json({ items: result.rows, instance: process.env.INSTANCE_NAME });
  } catch (error) {
    return res.status(500).json({ message: "Error al listar tareas", error: error.message });
  }
});

router.post("/", async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ message: "El titulo es obligatorio" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO tasks (title, description, user_id) VALUES ($1, $2, $3) RETURNING id, title, description, created_at",
      [title, description || "", req.user.id]
    );

    return res.status(201).json({
      message: "Tarea creada",
      item: result.rows[0],
      instance: process.env.INSTANCE_NAME,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al crear tarea", error: error.message });
  }
});

router.put("/:id", async (req, res) => {
  const { title, description } = req.body;

  if (!title) {
    return res.status(400).json({ message: "El titulo es obligatorio" });
  }

  try {
    const result = await pool.query(
      "UPDATE tasks SET title = $1, description = $2 WHERE id = $3 AND user_id = $4 RETURNING id, title, description, created_at",
      [title, description || "", req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    return res.json({
      message: "Tarea actualizada",
      item: result.rows[0],
      instance: process.env.INSTANCE_NAME,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al actualizar tarea", error: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id",
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Tarea no encontrada" });
    }

    return res.json({ message: "Tarea eliminada", instance: process.env.INSTANCE_NAME });
  } catch (error) {
    return res.status(500).json({ message: "Error al eliminar tarea", error: error.message });
  }
});

module.exports = router;
