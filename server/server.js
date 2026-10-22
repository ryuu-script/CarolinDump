import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { verifyPassword, DUMMY_HASH } from "./passwords.js";

// Reads the project's root .env (the same file Vite uses). Only keys starting with
// VITE_ ever reach the browser, so DB_PASSWORD stays on the server.
dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

const pool = mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
});

// Same codes as src/data/buildings.js. Anything else is rejected before touching the DB.
const BUILDINGS = new Set(["LB", "AF", "MR", "CHURCH", "JB", "ES", "FO", "EO", "SM", "PE", "RH"]);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

// GET /api/bathrooms/LB  ->  [{ room_code, unit, rating, img1, img2, img3 }, ...]
// (the frontend's normalizeRow() already understands img1/img2/img3)
app.get("/api/bathrooms/:table", async (req, res) => {
    const building = req.params.table.toUpperCase();
    if (!BUILDINGS.has(building)) return res.status(404).json({ error: "Unknown building" });

    try {
        // Values go through "?" placeholders, so they can never be read as SQL.
        const [rows] = await pool.execute(
            "SELECT room_code, unit, rating, img1, img2, img3 FROM bathrooms WHERE building = ? ORDER BY room_code",
            [building]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

// Simple in-memory brake on guessing: 5 failed tries per email+IP per 10 minutes.
const fails = new Map();
const MAX_FAILS = 5, WINDOW_MS = 10 * 60 * 1000;
const throttled = (key) => {
    const f = fails.get(key);
    if (!f || Date.now() - f.since > WINDOW_MS) { fails.delete(key); return false; }
    return f.count >= MAX_FAILS;
};
const noteFail = (key) => {
    const f = fails.get(key);
    if (!f || Date.now() - f.since > WINDOW_MS) fails.set(key, { count: 1, since: Date.now() });
    else f.count++;
};

// POST /api/admin/login  { email, password }  ->  { ok: true, email } or an error.
// Checks the admins table; the password is compared against its stored hash.
app.post("/api/admin/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!email || !password || email.length > 255 || password.length > 200) {
        return res.status(400).json({ error: "Enter your email and password." });
    }

    const key = `${req.ip}|${email}`;
    if (throttled(key)) return res.status(429).json({ error: "Too many attempts. Try again in a few minutes." });

    try {
        const [rows] = await pool.execute("SELECT email, password_hash FROM admins WHERE email = ? LIMIT 1", [email]);
        const admin = rows[0];
        const valid = verifyPassword(password, admin?.password_hash ?? DUMMY_HASH) && Boolean(admin);
        if (!valid) {
            noteFail(key);
            return res.status(401).json({ error: "Incorrect email or password." });
        }
        fails.delete(key);
        res.json({ ok: true, email: admin.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, async () => {
    console.log(`API listening on http://localhost:${port}`);
    if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
        console.warn("DB_USER or DB_PASSWORD is empty in .env. Fill them in and restart.");
        return;
    }
    try {
        await pool.query("SELECT 1");
        console.log("Database connection OK");
    } catch (err) {
        console.error("Database connection FAILED:", err.code, err.message);
    }
});