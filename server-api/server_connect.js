/*
Purpose: Runs the Express API: serves bathroom data and verifies admin logins.
Dependencies:
         JSX: NULL
         JS: password_manager.js
*/
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import express from "express";
import cors from "cors";
import mysql from "mysql2/promise";
import { verifyPassword, DUMMY_HASH } from "./password_manager.js";

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

const BUILDINGS = new Set(["LB", "AF", "MR", "CHURCH", "JB", "ES", "FO", "EO", "SM", "PE", "RH"]);

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

/*
Purpose: Handles GET /api/bathrooms/:table by returning every bathroom row for a building.
Parameters:
       req: Express request; req.params.table is the building code
       res: Express response used to send the JSON rows or an error
Return value:
       type: Promise<void>
       description: sends JSON with 200 on success, 404 for an unknown building, or 500 on a database error
*/
app.get("/api/bathrooms/:table", async (req, res) => {
    const building = req.params.table.toUpperCase();
    if (!BUILDINGS.has(building)) return res.status(404).json({ error: "Unknown building" });

    try {
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

const fails = new Map();
const MAX_FAILS = 5, WINDOW_MS = 10 * 60 * 1000;

/*
Purpose: Checks whether a login key (IP + email) has used up its failed attempts, to slow down password guessing.
Parameters:
       key: the "ip|email" string identifying the login attempts
Return value:
       type: boolean
       description: true when the key has reached the maximum failed tries within the time window
*/
const throttled = (key) => {
    const f = fails.get(key);
    if (!f || Date.now() - f.since > WINDOW_MS) { fails.delete(key); return false; }
    return f.count >= MAX_FAILS;
};
/*
Purpose: Records one failed login attempt for a key, starting a new time window when the old one has expired.
Parameters:
       key: the "ip|email" string identifying the login attempts
Return value: NULL
       type: NULL
       description: NULL
*/
const noteFail = (key) => {
    const f = fails.get(key);
    if (!f || Date.now() - f.since > WINDOW_MS) fails.set(key, { count: 1, since: Date.now() });
    else f.count++;
};

/*
Purpose: Handles POST /api/admin/login by checking the admin's credentials.
Parameters:
       req: Express request; req.body holds email and password
       res: Express response used to send the result
Return value:
       type: Promise<void>
       description: sends { ok: true, email } on success, or 400, 401, 429 or 500 with an error message
*/
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
const dist = fileURLToPath(new URL("../dist", import.meta.url));
app.use(express.static(dist));
app.get("/{*splat}", (req, res) => res.sendFile(path.join(dist, "index.html")));


/*
Purpose: Startup callback that runs once the server is listening: logs the address and checks that the database connection works.
Parameters: NULL
Return value:
       type: Promise<void>
       description: resolves after the connection check has been logged
*/
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