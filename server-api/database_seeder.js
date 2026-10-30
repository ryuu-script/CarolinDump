/*
Purpose: Seeds the database with sample bathrooms, reviews and the admin account.
Dependencies:
         JSX: NULL
         JS: password_manager.js
*/

import { fileURLToPath } from "node:url";
import { hashPassword } from "./password_manager.js";

const BUILDING_FLOORS = {
    LB: 4, AF: 3, MR: 3, CHURCH: 1, JB: 3, ES: 3, FO: 3, EO: 3, SM: 3, PE: 3, RH: 4,
};

const ROOM_SUFFIXES = ["12", "46"];

const UNITS = ["Left Stall", "Middle Stall", "Right Stall", "Left Urinal"];

const RATING_WEIGHTS = [1, 2, 3, 4, 3];

const REVIEW_COUNT_WEIGHTS = [3, 3, 3, 2, 1];

const REVIEWER_EMAILS = Array.from({ length: 12 }, (_, i) => `seed.student${i + 1}@usc.edu.ph`);

const COMMENTS = {
    1: ["Out of order again.", "Needs urgent cleaning.", "Please don't use this one.", null],
    2: ["Pretty rough, needs maintenance.", "Smelly and no soap.", "Wasn't great.", null],
    3: ["Okay, nothing special.", "Usable. Could be cleaner.", "Average.", null],
    4: ["Clean and well kept.", "Good, a little dim.", "Nice for a campus bathroom.", null],
    5: ["Spotless, easily the best on campus.", "Clean, bright and stocked.", "Perfect.", null],
};

/*
Purpose: Creates a seeded random number generator so every seeder run produces identical sample data.
Parameters:
       seed: integer starting value for the generator
Return value:
       type: function
       description: function that returns a new pseudo-random number in [0, 1) on each call
*/
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
/*
Purpose: Picks a random index where higher weights are more likely.
Parameters:
       weights: array of non-negative numbers, one per possible index
Return value:
       type: number
       description: the chosen index into weights
*/
const pickWeighted = (weights) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) return i;
    }
    return weights.length - 1;
};
/*
Purpose: Picks one random item from a list.
Parameters:
       list: non-empty array to choose from
Return value:
       type: any
       description: the randomly chosen item
*/
const pick = (list) => list[Math.floor(rand() * list.length)];
/*
Purpose: Keeps a number inside a range.
Parameters:
       n: the number to limit
       lo: the lowest allowed value
       hi: the highest allowed value
Return value:
       type: number
       description: n, or lo/hi when n falls outside the range
*/
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

const ADMINS = [
    { email: "23400055@usc.edu.ph", password: "sudo" },
];

/*
Purpose: Builds all the sample bathrooms and reviews in memory, without touching the database.
Parameters: NULL
Return value:
       type: { bathrooms: Array[], reviews: Object[] }
       description: bathrooms as [building, room_code, unit, rating, img1, img2, img3] rows, and reviews as { key, user_email, rating, comment } objects
*/
function buildData() {
    const bathrooms = [];
    const reviews = [];

    for (const [building, floors] of Object.entries(BUILDING_FLOORS)) {
        for (let floor = 1; floor <= floors; floor++) {
            for (const suffix of ROOM_SUFFIXES) {
                const room_code = `${building}${floor}${suffix}`;

                for (const unit of UNITS) {
                    const base = pickWeighted(RATING_WEIGHTS) + 1;
                    const count = pickWeighted(REVIEW_COUNT_WEIGHTS);

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

                    const rating = mine.length
                        ? clamp(Math.round(mine.reduce((s, r) => s + r.rating, 0) / mine.length), 1, 5)
                        : base;

                    bathrooms.push([building, room_code, unit, rating, null, null, null]);
                    reviews.push(...mine);
                }
            }
        }
    }
    return { bathrooms, reviews };
}

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

/*
Purpose: Makes sure the admins table exists and that every account in ADMINS is present, without changing existing admins.
Parameters:
       db: open mysql2 connection
Return value:
       type: Promise<void>
       description: resolves after logging how many admins were added
*/
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

/*
Purpose: Runs the seeder: connects, creates missing tables and inserts sample data (--force wipes first, --dry-run only prints).
Parameters: NULL
Return value:
       type: Promise<void>
       description: resolves when seeding finishes or there is nothing to do
*/
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
        await seedAdmins(db);

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