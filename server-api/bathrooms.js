/*
Purpose: Fetches and cleans a building's bathroom rows for the building and review submission pages.
Dependencies:
         JSX: NULL
         JS: buildings.js, server_connect.js
*/

import { getBuilding } from "../src/data/buildings.js";

const USE_MOCK_DATA = false;
const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

/*
Purpose: Turns a raw database row into the shape the building and review pages expect.
Parameters:
       row: one raw bathroom row from the API or database
Return value:
       type: { id: number | null, img: string[], room_code: string, unit: string, rating: number, review_count: number }
       description: the cleaned row with database id, up to 3 images, rating (0 when unreviewed, 0..5 otherwise), and review_count
*/
function normalizeRow(row) {
    const rawImages = Array.isArray(row.img)
        ? row.img
        : [row.img, row.img1, row.img2, row.img3];

    const rawId = Number(row.id);
    const rawReviewCount = Number(row.review_count ?? 0);
    const reviewCount = Number.isFinite(rawReviewCount)
        ? Math.max(0, rawReviewCount)
        : 0;
    const ratingValue = Number(row.rating);

    return {
        id: Number.isInteger(rawId) && rawId > 0 ? rawId : null,
        img: rawImages
            .filter((src) => typeof src === "string" && src.trim() !== "")
            .slice(0, 3),
        room_code: String(row.room_code ?? "").trim(),
        unit: String(row.unit ?? "").trim(),
        rating:
            reviewCount > 0 && Number.isFinite(ratingValue)
                ? Math.min(5, Math.max(0, ratingValue))
                : 0,
        review_count: reviewCount,
    };
}

const MOCK_UNITS = [
    "Left Stall", "Middle Stall", "Right Stall",
    "Left Urinal", "Middle Urinal", "Right Urinal",
];

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
                review_count: 0,
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
        }, { once: true });
    });

export async function fetchBathrooms(buildingId, { signal } = {}) {
    const building = getBuilding(buildingId);

    if (!building) {
        throw new Error(`Unknown building: ${buildingId}`);
    }

    if (USE_MOCK_DATA) {
        await wait(400, signal);
        return mockRows(building.code).map(normalizeRow);
    }

    const res = await fetch(
        `${API_BASE}/bathrooms/${encodeURIComponent(building.code)}`,
        { signal }
    );

    if (!res.ok) {
        throw new Error(
            `Could not load ${building.code} (HTTP ${res.status})`
        );
    }

    const data = await res.json();

    if (!Array.isArray(data)) {
        throw new Error("Unexpected response from the server");
    }

    return data.map(normalizeRow);
}
