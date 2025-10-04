import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4001;

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// CREATE (ya lo tenías)
app.post("/users", async (req, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ error: "name & email required" });

  try {
    const r = await pool.query(
      "INSERT INTO users_schema.users(name, email) VALUES($1, $2) RETURNING id, name, email",
      [name.trim(), email.trim().toLowerCase()]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    const msg = String(e);
    const conflict = msg.includes("duplicate key") || msg.toLowerCase().includes("unique");
    res.status(conflict ? 409 : 500).json({ error: conflict ? "email already exists" : "insert failed", detail: msg });
  }
});

// READ all (ya lo tenías)
app.get("/users", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id, name, email FROM users_schema.users ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// READ by id (nuevo)
app.get("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  try {
    const r = await pool.query(
      "SELECT id, name, email FROM users_schema.users WHERE id = $1",
      [id]
    );
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// UPDATE (nuevo)
app.put("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  const { name, email } = req.body ?? {};
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });
  if (!name && !email) return res.status(400).json({ error: "nothing to update" });

  const sets = [];
  const vals = [];
  let i = 1;
  if (name)  { sets.push(`name = $${i++}`);  vals.push(name.trim()); }
  if (email) { sets.push(`email = $${i++}`); vals.push(email.trim().toLowerCase()); }
  vals.push(id);

  try {
    const r = await pool.query(
      `UPDATE users_schema.users SET ${sets.join(", ")} WHERE id = $${i}
       RETURNING id, name, email`,
      vals
    );
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.json(r.rows[0]);
  } catch (e) {
    const msg = String(e);
    const conflict = msg.includes("duplicate key") || msg.toLowerCase().includes("unique");
    res.status(conflict ? 409 : 500).json({ error: conflict ? "email already exists" : "update failed", detail: msg });
  }
});

// DELETE (nuevo)
app.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  try {
    const r = await pool.query("DELETE FROM users_schema.users WHERE id = $1", [id]);
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Health simple
app.get("/health", (_req, res) => res.json({ status: "ok", service: "users-api" }));

app.listen(PORT, () => console.log(`✅ users-api on http://localhost:${PORT}`));
