import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4002;
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// -------- Health --------
app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// -------- PRODUCTS CRUD (PostgreSQL) --------

// CREATE
app.post("/products", async (req, res) => {
  const { name, price, stock = 0 } = req.body ?? {};
  if (!name || price == null) return res.status(400).json({ error: "name & price required" });

  const p = Number(price);
  const s = Number(stock);
  if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "price must be >= 0" });
  if (Number.isNaN(s) || s < 0) return res.status(400).json({ error: "stock must be >= 0" });

  try {
    const r = await pool.query(
      `INSERT INTO products_schema.products(name, price, stock)
       VALUES ($1,$2,$3)
       RETURNING id, name, price, stock, created_at`,
      [String(name).trim(), p, s]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// READ all
app.get("/products", async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT id, name, price, stock, created_at FROM products_schema.products ORDER BY id ASC"
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// READ by id
app.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  try {
    const r = await pool.query(
      "SELECT id, name, price, stock, created_at FROM products_schema.products WHERE id = $1",
      [id]
    );
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// UPDATE (parcial o total)
app.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  const { name, price, stock } = req.body ?? {};
  const sets = [];
  const vals = [];
  let i = 1;

  if (name != null)  { sets.push(`name = $${i++}`);  vals.push(String(name).trim()); }
  if (price != null) {
    const p = Number(price);
    if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "price must be >= 0" });
    sets.push(`price = $${i++}`); vals.push(p);
  }
  if (stock != null) {
    const s = Number(stock);
    if (Number.isNaN(s) || s < 0) return res.status(400).json({ error: "stock must be >= 0" });
    sets.push(`stock = $${i++}`); vals.push(s);
  }
  if (!sets.length) return res.status(400).json({ error: "nothing to update" });

  vals.push(id);

  try {
    const r = await pool.query(
      `UPDATE products_schema.products
       SET ${sets.join(", ")}
       WHERE id = $${i}
       RETURNING id, name, price, stock, created_at`,
      vals
    );
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

// DELETE
app.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  try {
    const r = await pool.query("DELETE FROM products_schema.products WHERE id = $1", [id]);
    if (!r.rowCount) return res.status(404).json({ error: "not found" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// -------- Integración: products + users count --------
app.get("/products/with-users", async (_req, res) => {
  try {
    const [prod, usersResp] = await Promise.all([
      pool.query("SELECT id, name, price, stock, created_at FROM products_schema.products ORDER BY id ASC"),
      fetch(`${USERS_API_URL}/users`).then(r => r.json()).catch(() => [])
    ]);
    res.json({
      products: prod.rows,
      usersCount: Array.isArray(usersResp) ? usersResp.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "failed to fetch data", detail: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
});
