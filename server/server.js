import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";

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