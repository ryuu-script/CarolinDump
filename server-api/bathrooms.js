/*
Purpose: Fetches and cleans a building's bathroom rows for the building and review submission pages.
Dependencies:
         JSX: NULL
         JS: buildings.js, server_connect.js (the /api/bathrooms route it calls at runtime)
*/
import { getBuilding } from "../src/data/buildings.js";

const USE_MOCK_DATA = false;
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

/*
Purpose: Turns a raw database row into the shape the page expects.
Parameters:
       row: one raw bathroom row from the API or database
Return value:
       type: { id: number | null, img: string[], room_code: string, unit: string, rating: number }
       description: the cleaned row, with database id, at most 3 images and a rating clamped to 1..5
*/
function normalizeRow(row) {
    const rawImages = Array.isArray(row.img)
        ? row.img
        : [row.img, row.img1, row.img2, row.img3];

    const rating = Math.round(Number(row.rating));
    const rawId = Number(row.id);

    return {
        id: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
        img: rawImages.filter((src) => typeof src === "string" && src.trim() !== "").slice(0, 3),
        room_code: String(row.room_code ?? "").trim(),
        unit: String(row.unit ?? "").trim(),
        rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, rating)) : 1,
    };
}

const MOCK_UNITS = [
    "Left Stall", "Middle Stall", "Right Stall",
    "Left Urinal", "Middle Urinal", "Right Urinal",
];

/*
Purpose: Builds made-up bathroom rows for a building so the app can run before the database exists.
Parameters:
       code: building code, e.g. "LB"
Return value:
       type: Object[]
       description: 16 raw mock rows (4 floors x 4 rooms) with id, room_code, unit, rating and no images
*/
function mockRows(code) {
    const prefix = code.toUpperCase();
    const rows = [];
    for (let floor = 1; floor <= 4; floor++) {
        for (let n = 1; n <= 4; n++) {
            const i = rows.length;
            rows.push({
                id: i + 1,
                img: [],
                room_code: `${prefix}${floor}${String(n * 7).padStart(2, "0")}`,
                unit: MOCK_UNITS[i % MOCK_UNITS.length],
                rating: (i * 3) % 5 + 1,
            });
        }
    }
    return rows;
}

/*
Purpose: Pauses for a short time to imitate network delay in mock mode, and stops early if the request is cancelled.
Parameters:
       ms: how many milliseconds to wait
       signal: optional AbortSignal that cancels the wait
Return value:
       type: Promise<void>
       description: resolves after ms, or rejects with an AbortError when signal aborts
*/
const wait = (ms, signal) =>
    new Promise((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal?.addEventListener("abort", () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
        });
    });

/*
Purpose: Loads every bathroom row that belongs to a building so the building and submit review pages can list its units.
Parameters:
       buildingId: building id from the URL, e.g. "lb"
       options: optional object; options.signal is an AbortSignal to cancel the request
Return value:
       type: Promise<Object[]>
       description: normalized rows (so rows.length is the card count); rejects if the building is unknown or the request fails
*/
export async function fetchBathrooms(buildingId, { signal } = {}) {
    const building = getBuilding(buildingId);
    if (!building) throw new Error(`Unknown building: ${buildingId}`);

    if (USE_MOCK_DATA) {
        await wait(400, signal);
        return mockRows(building.code).map(normalizeRow);
    }

    const res = await fetch(`${API_BASE}/bathrooms/${encodeURIComponent(building.code)}`, { signal });
    if (!res.ok) throw new Error(`Could not load ${building.code} (HTTP ${res.status})`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Unexpected response from the server");
    return data.map(normalizeRow);
}
