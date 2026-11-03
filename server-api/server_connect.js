/*
Purpose: Runs the Express API: serves bathroom data, accepts verified student reviews, and verifies admin logins.
Dependencies:
         JSX: NULL
         JS: password_manager.js
*/
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createPublicKey, verify as cryptoVerify } from "node:crypto";
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
const ALLOWED_EMAIL_DOMAIN = "usc.edu.ph";
const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const MAX_COMMENT_LENGTH = 500;

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json());

/*
Purpose: Checks that an email belongs to an official University of San Carlos account (@usc.edu.ph).
Parameters:
       email: email address string to validate
Return value:
       type: boolean
       description: true only when the email has one "@", a non-empty local part, and exact usc.edu.ph domain
*/
function isCarolinianEmail(email) {
    if (typeof email !== "string") return false;
    const parts = email.trim().toLowerCase().split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1] === ALLOWED_EMAIL_DOMAIN;
}

let cachedGoogleJwks = { keys: [], expiresAt: 0 };

/*
Purpose: Loads Google's public JSON Web Keys used to verify Google ID token signatures, caching them until expiry.
Parameters:
       forceRefresh: true to bypass cache when Google rotates keys
Return value:
       type: Promise<Object[]>
       description: list of Google RSA JWK objects
*/
async function getGoogleJwks(forceRefresh = false) {
    if (!forceRefresh && cachedGoogleJwks.keys.length > 0 && Date.now() < cachedGoogleJwks.expiresAt) {
        return cachedGoogleJwks.keys;
    }
    const res = await fetch(GOOGLE_CERTS_URL);
    if (!res.ok) throw new Error(`Failed to fetch Google certs (HTTP ${res.status})`);

    const cacheControl = res.headers.get("cache-control") ?? "";
    const maxAgeMatch = /max-age=(\d+)/i.exec(cacheControl);
    const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;

    const data = await res.json();
    const keys = Array.isArray(data?.keys) ? data.keys : [];
    cachedGoogleJwks = { keys, expiresAt: Date.now() + ttlMs };
    return keys;
}

/*
Purpose: Cryptographically verifies a Google ID token and ensures it belongs to a verified @usc.edu.ph account.
Parameters:
       token: raw JWT bearer token from the Authorization header
Return value:
       type: Promise<{ ok: true, email: string, name: string } | { ok: false, status: number, error: string }>
       description: verified Carolinian user identity, or an HTTP status and error message when rejected
*/
async function verifyGoogleToken(token) {
    const clientId = process.env.VITE_GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
        return { ok: false, status: 503, error: "Google sign-in is not configured on the server." };
    }
    if (typeof token !== "string" || !token.trim()) {
        return { ok: false, status: 401, error: "Sign in with your @usc.edu.ph Google account to submit a review." };
    }

    const parts = token.trim().split(".");
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        return { ok: false, status: 401, error: "Invalid authentication token. Please sign in again." };
    }

    let header;
    let claims;
    try {
        header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
        claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    } catch {
        return { ok: false, status: 401, error: "Invalid authentication token. Please sign in again." };
    }

    if (header?.alg !== "RS256" || typeof header?.kid !== "string" || !header.kid) {
        return { ok: false, status: 401, error: "Invalid authentication token. Please sign in again." };
    }

    const validIssuer = claims?.iss === "https://accounts.google.com" || claims?.iss === "accounts.google.com";
    if (!validIssuer || claims?.aud !== clientId) {
        return { ok: false, status: 401, error: "Invalid authentication token. Please sign in again." };
    }

    if (typeof claims?.exp !== "number" || claims.exp * 1000 <= Date.now()) {
        return { ok: false, status: 401, error: "Your Google sign-in has expired. Please sign in again." };
    }

    let keys = await getGoogleJwks(false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) {
        keys = await getGoogleJwks(true);
        jwk = keys.find((k) => k.kid === header.kid);
    }
    if (!jwk) {
        return { ok: false, status: 401, error: "Could not verify Google sign-in key. Please sign in again." };
    }

    let signatureValid = false;
    try {
        const publicKey = createPublicKey({ key: jwk, format: "jwk" });
        signatureValid = cryptoVerify(
            "RSA-SHA256",
            Buffer.from(`${parts[0]}.${parts[1]}`),
            publicKey,
            Buffer.from(parts[2], "base64url")
        );
    } catch {
        signatureValid = false;
    }

    if (!signatureValid) {
        return { ok: false, status: 401, error: "Invalid authentication signature. Please sign in again." };
    }

    if (claims.email_verified !== true || !isCarolinianEmail(claims.email)) {
        return { ok: false, status: 403, error: "Only verified @usc.edu.ph Google accounts can submit reviews." };
    }

    return {
        ok: true,
        email: claims.email.trim().toLowerCase(),
        name: typeof claims.name === "string" ? claims.name.trim() : "",
    };
}

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
            "SELECT id, room_code, unit, rating, img1, img2, img3 FROM bathrooms WHERE building = ? ORDER BY room_code, unit",
            [building]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Database error" });
    }
});

/*
Purpose: Handles POST /api/reviews by verifying USC Google sign-in, checking building-unit relationships, and saving the review.
Parameters:
       req: Express request with Bearer token and { building, bathroomId, room_code, unit, rating, comment }
       res: Express response used to send the saved review or an error
Return value:
       type: Promise<void>
       description: sends 201 on success, or 400, 401, 403, 409, 500, 503 with an error message
*/
app.post("/api/reviews", async (req, res) => {
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const bearerMatch = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    const token = bearerMatch ? bearerMatch[1].trim() : "";

    let authResult;
    try {
        authResult = await verifyGoogleToken(token);
    } catch (err) {
        console.error(err);
        return res.status(503).json({ error: "Could not verify Google sign-in right now. Please try again." });
    }
    if (!authResult.ok) {
        return res.status(authResult.status).json({ error: authResult.error });
    }

    const building = typeof req.body?.building === "string" ? req.body.building.trim().toUpperCase() : "";
    if (!building || !BUILDINGS.has(building)) {
        return res.status(400).json({ error: "Please select a valid campus building." });
    }

    const bathroomId = Number(req.body?.bathroomId);
    const roomCode = typeof req.body?.room_code === "string" ? req.body.room_code.trim() : "";
    const unitName = typeof req.body?.unit === "string" ? req.body.unit.trim() : "";

    const hasValidId = Number.isInteger(bathroomId) && bathroomId > 0;
    if (!hasValidId && (!roomCode || !unitName)) {
        return res.status(400).json({ error: "Please select a valid comfort room unit." });
    }

    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Please select a Rubi rating between 1 and 5." });
    }

    const comment = typeof req.body?.comment === "string" ? req.body.comment.trim() : "";
    if (!comment) {
        return res.status(400).json({ error: "Please write a short review message." });
    }
    if (comment.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({ error: `Review message must be ${MAX_COMMENT_LENGTH} characters or fewer.` });
    }

    try {
        let bathroomRows;
        if (hasValidId) {
            [bathroomRows] = await pool.execute(
                "SELECT id, building, room_code, unit FROM bathrooms WHERE id = ? AND building = ? LIMIT 1",
                [bathroomId, building]
            );
        } else {
            [bathroomRows] = await pool.execute(
                "SELECT id, building, room_code, unit FROM bathrooms WHERE building = ? AND room_code = ? AND unit = ? LIMIT 1",
                [building, roomCode, unitName]
            );
        }

        const bathroom = bathroomRows[0];
        if (!bathroom) {
            return res.status(400).json({
                error: "The selected comfort room unit does not belong to the selected building.",
            });
        }
        if ((roomCode && bathroom.room_code !== roomCode) || (unitName && bathroom.unit !== unitName)) {
            return res.status(400).json({
                error: "The selected comfort room unit does not match the building record.",
            });
        }

        const [insertResult] = await pool.execute(
            "INSERT INTO reviews (bathroom_id, user_email, rating, `COMMENT`) VALUES (?, ?, ?, ?)",
            [bathroom.id, authResult.email, rating, comment]
        );

        return res.status(201).json({
            ok: true,
            review: {
                id: insertResult.insertId,
                bathroom_id: bathroom.id,
                building: bathroom.building,
                room_code: bathroom.room_code,
                unit: bathroom.unit,
                user_email: authResult.email,
                rating,
                comment,
            },
        });
    } catch (err) {
        if (err?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "You have already submitted a review for this comfort room unit.",
            });
        }
        console.error(err);
        return res.status(500).json({ error: "Database error" });
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
