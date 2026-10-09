import { getBuilding } from "../data/buildings.js";

// ---------------------------------------------------------------------------
// Database access for the bathroom tables.
//
// There is no database yet, so USE_MOCK_DATA = true makes this file return
// made-up rows. When the database/back end is ready:
//   1. set USE_MOCK_DATA to false,
//   2. set VITE_API_URL in a .env file (or change API_BASE below),
//   3. make the server answer  GET {API_BASE}/bathrooms/:table
//      with a JSON array of rows: [{ img, room_code, unit, rating }, ...]
//
// Never build SQL from the table name on the server without checking it
// against the whitelist in data/buildings.js, since it comes from the URL.
// ---------------------------------------------------------------------------
const USE_MOCK_DATA = true;
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// Turns whatever the database returns into the shape the page expects.
//   img        -> array of 0..3 image URLs (accepts an array, a single URL, or img1/img2/img3 columns)
//   room_code  -> string, letters + numbers (e.g. "LB446")
//   unit       -> string, letters only
//   rating     -> whole number 1..5
function normalizeRow(row) {
    const rawImages = Array.isArray(row.img)
        ? row.img
        : [row.img, row.img1, row.img2, row.img3];

    const rating = Math.round(Number(row.rating));

    return {
        img: rawImages.filter((src) => typeof src === "string" && src.trim() !== "").slice(0, 3),
        room_code: String(row.room_code ?? "").trim(),
        unit: String(row.unit ?? "").trim(),
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 1,
    };
}

// ---------- Mock data (delete once the database is connected) ----------
const MOCK_UNITS = [
    "Left Stall", "Middle Stall", "Right Stall",
    "Left Urinal", "Middle Urinal", "Right Urinal",
];

function mockRows(table) {
    const prefix = table.toUpperCase();
    const rows = [];
    for (let floor = 1; floor <= 4; floor++) {
        for (let n = 1; n <= 4; n++) {
            const i = rows.length;
            rows.push({
                img: [],
                room_code: `${prefix}${floor}${String(n * 7).padStart(2, "0")}`,
                unit: MOCK_UNITS[i % MOCK_UNITS.length],
                rating: (i * 3) % 5 + 1,
            });
        }
    }
    return rows;
}

const wait = (ms, signal) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });

// Fetches every row of the table that belongs to `buildingId`.
// Resolves to an array of normalized rows (so `rows.length` is the card count).
export async function fetchBathrooms(buildingId, { signal } = {}) {
    const building = getBuilding(buildingId);
    if (!building) throw new Error(`Unknown building: ${buildingId}`);

    if (USE_MOCK_DATA) {
        await wait(400, signal);
        return mockRows(building.table).map(normalizeRow);
    }

    const res = await fetch(`${API_BASE}/bathrooms/${encodeURIComponent(building.table)}`, { signal });
    if (!res.ok) throw new Error(`Could not load ${building.table} (HTTP ${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Unexpected response from the server");
    return data.map(normalizeRow);
}