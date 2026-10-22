// Database seeder for CarolinDump (db: s23400055_tubolDB, tables: bathrooms, reviews).
//
//   node server/seed.js             seed ONLY if the bathrooms table is empty (safe to run any time)
//   node server/seed.js --force     wipe bathrooms + reviews, then seed again
//   node server/seed.js --dry-run   build the data and print a summary; never touches the database
//
// Or through npm:  npm run seed   |   npm run seed:fresh
//
// setup.sh runs the first form, so a fresh machine ends up with data and an existing
// database is never overwritten.
//
// The rooms, units, ratings and reviews below are SAMPLE data so the app has something to
// show. Edit BUILDING_FLOORS / ROOM_SUFFIXES / UNITS to match the real campus layout.
// The output is deterministic (fixed random seed), so every run produces the same rows.

import { fileURLToPath } from "node:url";
import { hashPassword } from "./passwords.js";

// ---------------------------------------------------------------------------
// 1. What to generate
// ---------------------------------------------------------------------------

// Same codes as src/data/buildings.js and the BUILDINGS whitelist in server/server.js.
// Value = number of floors that have bathrooms.
const BUILDING_FLOORS = {
    LB: 4, AF: 3, MR: 3, CHURCH: 1, JB: 3, ES: 3, FO: 3, EO: 3, SM: 3, PE: 3, RH: 4,
};

// Room code = building + floor + suffix, e.g. LB + 4 + 46 = LB446 (the floor is the first digit).
const ROOM_SUFFIXES = ["12", "46"];

// One row (= one card in the app) per unit in every room.
const UNITS = ["Left Stall", "Middle Stall", "Right Stall", "Left Urinal"];

// Weighted pick for a unit's base rating (index 0 = 1 star ... index 4 = 5 stars).
const RATING_WEIGHTS = [1, 2, 3, 4, 3];

// How many reviews a unit gets (index = count).
const REVIEW_COUNT_WEIGHTS = [3, 3, 3, 2, 1];

// Fake accounts for the sample reviews. Not real people.
const REVIEWER_EMAILS = Array.from({ length: 12 }, (_, i) => `seed.student${i + 1}@usc.edu.ph`);

const COMMENTS = {
    1: ["Out of order again.", "Needs urgent cleaning.", "Please don't use this one.", null],
    2: ["Pretty rough, needs maintenance.", "Smelly and no soap.", "Wasn't great.", null],
    3: ["Okay, nothing special.", "Usable. Could be cleaner.", "Average.", null],
    4: ["Clean and well kept.", "Good, a little dim.", "Nice for a campus bathroom.", null],
    5: ["Spotless, easily the best on campus.", "Clean, bright and stocked.", "Perfect.", null],
};

// ---------------------------------------------------------------------------
// 2. Deterministic random numbers (so re-seeding gives identical data)
// ---------------------------------------------------------------------------

function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = mulberry32(20261022);
const pickWeighted = (weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
    }
    return weights.length - 1;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Admin accounts. The admins table is created if it is missing, and each account below is
// added if its email isn't there yet (existing admins are never changed or removed, and
// --force does not touch this table). Passwords are stored hashed, never as plain text.
const ADMINS = [
    { email: "23400055@usc.edu.ph", password: "sudo" },
];

// ---------------------------------------------------------------------------
// 3. Build the rows in memory
// ---------------------------------------------------------------------------

function buildData() {
    const bathrooms = []; // [building, room_code, unit, rating, img1, img2, img3]
    const reviews = [];   // { key, user_email, rating, comment }

    for (const [building, floors] of Object.entries(BUILDING_FLOORS)) {
        for (let floor = 1; floor <= floors; floor++) {
            for (const suffix of ROOM_SUFFIXES) {
                const room_code = `${building}${floor}${suffix}`;

                for (const unit of UNITS) {
                    const base = pickWeighted(RATING_WEIGHTS) + 1;
                    const count = pickWeighted(REVIEW_COUNT_WEIGHTS);

                    // Distinct reviewers per unit.
                    const pool = [...REVIEWER_EMAILS];
                    const mine = [];
                    for (let i = 0; i < count; i++) {
                        const email = pool.splice(Math.floor(rand() * pool.length), 1)[0];
                        const rating = clamp(base + Math.floor(rand() * 3) - 1, 1, 5);
                        mine.push({
                            key: `${building}|${room_code}|${unit}`,
                            user_email: email,
                            rating,
                            comment: pick(COMMENTS[rating]),
                        });
                    }

                    // The bathroom's stored rating matches its reviews (rounded average).
                    const rating = mine.length
                        ? clamp(Math.round(mine.reduce((s, r) => s + r.rating, 0) / mine.length), 1, 5)
                        : base;

                    // No image URLs are invented: img1..img3 stay NULL ("No photos" in the app).
                    bathrooms.push([building, room_code, unit, rating, null, null, null]);
                    reviews.push(...mine);
                }
            }
        }
    }
    return { bathrooms, reviews };
}

// ---------------------------------------------------------------------------
// 4. Database work
// ---------------------------------------------------------------------------

// Only runs when a table is missing (it never alters an existing one). Matches the columns
// in phpMyAdmin; the UNIQUE keys are what stops duplicate rows when the seeder is re-run.
const CREATE_BATHROOMS = `
CREATE TABLE IF NOT EXISTS bathrooms (
    id         INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    building   VARCHAR(10)  NOT NULL,
    room_code  VARCHAR(20)  NOT NULL,
    unit       VARCHAR(50)  NOT NULL,
    rating     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    img1       VARCHAR(500) NULL DEFAULT NULL,
    img2       VARCHAR(500) NULL DEFAULT NULL,
    img3       VARCHAR(500) NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_bathroom_unit (building, room_code, unit)
)`;

const CREATE_REVIEWS = `
CREATE TABLE IF NOT EXISTS reviews (
    id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    bathroom_id INT UNSIGNED NOT NULL,
    user_email  VARCHAR(255) NOT NULL,
    rating      TINYINT UNSIGNED NOT NULL,
    \`COMMENT\`   TEXT NULL DEFAULT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_review_user (bathroom_id, user_email)
)`;

const CREATE_ADMINS = `
CREATE TABLE IF NOT EXISTS admins (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_admin_email (email)
)`;

async function seedAdmins(db) {
    await db.query(CREATE_ADMINS);
    let added = 0;
    for (const { email, password } of ADMINS) {
        const [res] = await db.query(
            "INSERT IGNORE INTO admins (email, password_hash) VALUES (?, ?)",
            [email.toLowerCase(), hashPassword(password)]
        );
        added += res.affectedRows;
    }
    console.log(`Seeder: admins table ready (${added} added, ${ADMINS.length - added} already present).`);
}

async function main() {
    const args = new Set(process.argv.slice(2));
    const force = args.has("--force");
    const dryRun = args.has("--dry-run");

    const { bathrooms, reviews } = buildData();

    if (dryRun) {
        console.log(`Dry run: would insert ${bathrooms.length} bathrooms and ${reviews.length} reviews, and ensure ${ADMINS.length} admin(s).`);
        console.log("Sample rows:", bathrooms.slice(0, 3));
        return;
    }

    // Loaded here (not at the top) so --dry-run works even before `npm install`.
    const { default: dotenv } = await import("dotenv");
    const { default: mysql } = await import("mysql2/promise");
    dotenv.config({ path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true });

    const { DB_HOST = "localhost", DB_PORT = "3306", DB_USER, DB_PASSWORD, DB_NAME } = process.env;
    if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
        console.error("Seeder: DB_USER, DB_PASSWORD or DB_NAME is blank in .env, so there is nothing to connect to.");
        process.exit(1);
    }

    const db = await mysql.createConnection({
        host: DB_HOST,
        port: Number(DB_PORT),
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
    });

    try {
        await db.query(CREATE_BATHROOMS);
        await db.query(CREATE_REVIEWS);
        await seedAdmins(db); // runs every time, even when bathrooms are already seeded

        if (force) {
            console.log("--force given: clearing reviews and bathrooms.");
            await db.query("SET FOREIGN_KEY_CHECKS = 0");
            await db.query("TRUNCATE TABLE reviews");
            await db.query("TRUNCATE TABLE bathrooms");
            await db.query("SET FOREIGN_KEY_CHECKS = 1");
        } else {
            const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM bathrooms");
            if (n > 0) {
                console.log(`Seeder: bathrooms already has ${n} rows, nothing to do. (Use --force to wipe and reseed.)`);
                return;
            }
        }

        await db.beginTransaction();
        try {
            await db.query(
                "INSERT IGNORE INTO bathrooms (building, room_code, unit, rating, img1, img2, img3) VALUES ?",
                [bathrooms]
            );

            // Look the ids up instead of assuming 1..N, so this also works if AUTO_INCREMENT isn't at 1.
            const [rows] = await db.query("SELECT id, building, room_code, unit FROM bathrooms");
            const idByKey = new Map(rows.map((r) => [`${r.building}|${r.room_code}|${r.unit}`, r.id]));

            const reviewRows = reviews
                .filter((r) => idByKey.has(r.key))
                .map((r) => [idByKey.get(r.key), r.user_email, r.rating, r.comment]);

            if (reviewRows.length > 0) {
                await db.query(
                    "INSERT IGNORE INTO reviews (bathroom_id, user_email, rating, `COMMENT`) VALUES ?",
                    [reviewRows]
                );
            }
            await db.commit();
            console.log(`Seeder: inserted ${bathrooms.length} bathrooms and ${reviewRows.length} reviews into ${DB_NAME}.`);
        } catch (err) {
            await db.rollback();
            throw err;
        }
    } finally {
        await db.end();
    }
}

main().catch((err) => {
    console.error("Seeder failed:", err.code ?? "", err.message);
    process.exit(1);
});