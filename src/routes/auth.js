const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Completa nombre, email y password" });
  }

  try {
    const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "El email ya existe" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );

    return res.status(201).json({
      message: "Usuario registrado",
      user: result.rows[0],
      instance: process.env.INSTANCE_NAME,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al registrar usuario", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Completa email y password" });
  }

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || "super-secreto-demo",
      { expiresIn: "2h" }
    );

    return res.json({
      message: "Login correcto",
      token,
      user: { id: user.id, name: user.name, email: user.email },
      instance: process.env.INSTANCE_NAME,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error al iniciar sesion", error: error.message });
  }
});

module.exports = router;
