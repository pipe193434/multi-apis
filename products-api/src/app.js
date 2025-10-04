import express from "express";
import cors from "cors";
import products from "./data.json" assert { type: "json" };
import fetch from "node-fetch";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// Paths seguros para Windows/Linux
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "data.json");

// Helper para persistir el mock
async function saveProducts() {
  await writeFile(DATA_PATH, JSON.stringify(products, null, 2), "utf8");
}

const PORT = process.env.PORT || 4002;
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// Ejemplo de comunicación entre servicios
app.get("/products/with-users", async (_req, res) => {
  try {
    const r = await fetch(`${USERS_API_URL}/users`);
    const users = await r.json();
    res.json({
      products,
      usersCount: Array.isArray(users) ? users.length : 0
    });
  } catch (e) {
    res.status(502).json({ error: "No se pudo consultar users-api", detail: String(e) });
  }
});

// READ all
app.get("/products", (_req, res) => res.json(products));

// READ by id
app.get("/products/:id", (req, res) => {
  const p = products.find(x => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: "Product not found" });
  res.json(p);
});

// CREATE (persiste en data.json)
app.post("/products", async (req, res) => {
  const { name, price, stock = 0 } = req.body ?? {};
  if (!name || price == null) return res.status(400).json({ error: "name & price required" });

  const p = Number(price);
  const s = Number(stock);
  if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "price must be >= 0" });
  if (Number.isNaN(s) || s < 0) return res.status(400).json({ error: "stock must be >= 0" });

  const nextId = (products.reduce((m, x) => Math.max(m, Number(x.id)), 0) || 0) + 1;
  const newItem = { id: nextId, name: String(name).trim(), price: p, stock: s };

  products.push(newItem);
  await saveProducts();
  res.status(201).json(newItem);
});

// UPDATE (parcial o total)
app.put("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  const idx = products.findIndex(x => Number(x.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });

  const { name, price, stock } = req.body ?? {};

  if (name != null) products[idx].name = String(name).trim();

  if (price != null) {
    const p = Number(price);
    if (Number.isNaN(p) || p < 0) return res.status(400).json({ error: "price must be >= 0" });
    products[idx].price = p;
  }

  if (stock != null) {
    const s = Number(stock);
    if (Number.isNaN(s) || s < 0) return res.status(400).json({ error: "stock must be >= 0" });
    products[idx].stock = s;
  }

  await saveProducts();
  res.json(products[idx]);
});

// DELETE
app.delete("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "invalid id" });

  const idx = products.findIndex(x => Number(x.id) === id);
  if (idx === -1) return res.status(404).json({ error: "Product not found" });

  products.splice(idx, 1);
  await saveProducts();
  res.status(204).send();
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
});
