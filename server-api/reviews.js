/*
Purpose: Sends a signed-in USC student's comfort room review to the Express API.
Dependencies:
         JSX: NULL
         JS: server_connect.js (the /api/reviews route it calls at runtime)
*/

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export const MAX_COMMENT_LENGTH = 500;

/*
Purpose: Submits a student's comfort room review with their Google ID token for backend verification.
Parameters:
       payload: { building: string, bathroomId: number | null, room_code: string, unit: string, rating: number, comment: string, idToken: string }
Return value:
       type: Promise<{ ok: true, review: Object } | { ok: false, status: number, error: string }>
       description: ok true with the saved review on success; otherwise ok false with the HTTP status and error message
*/
export async function submitReview({ building, bathroomId, room_code, unit, rating, comment, idToken }) {
    let res;
    try {
        const headers = { "Content-Type": "application/json" };
        if (typeof idToken === "string" && idToken.trim()) {
            headers.Authorization = `Bearer ${idToken.trim()}`;
        }
        res = await fetch(`${API_BASE}/reviews`, {
            method: "POST",
            headers,
            body: JSON.stringify({
                building,
                bathroomId,
                room_code,
                unit,
                rating,
                comment,
            }),
        });
    } catch {
        return { ok: false, status: 0, error: "Can't reach the server. Is it running?" };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
        return {
            ok: false,
            status: res.status,
            error: data.error ?? `Could not submit your review (HTTP ${res.status}).`,
        };
    }

    return { ok: true, review: data.review };
}

