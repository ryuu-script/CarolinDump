/*
Purpose: Handles admin sign-in and keeps the admin session so admin-only screens can be gated.
Dependencies:
         JSX: NULL
         JS: server_connect.js (the /api/admin/login route it calls at runtime)
*/
const KEY = "carolindump.admin";

/*
Purpose: Tells the app whether an admin is currently signed in (used to gate the admin screens).
Parameters: NULL
Return value:
       type: string | null
       description: the signed-in admin's email from sessionStorage, or null when nobody is signed in or storage is unavailable
*/
export const getAdmin = () => {
    try { return window.sessionStorage.getItem(KEY); } catch { return null; }
};

/*
Purpose: Signs the admin out by clearing the stored admin session.
Parameters: NULL
Return value: NULL
       type: NULL
       description: NULL
*/
export const signOutAdmin = () => {
    try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

/*
Purpose: Signs an admin in through the server and remembers them for the session.
Parameters:
       email: the admin's email address
       password: the admin's plain-text password, sent only to the server over the login request
Return value:
       type: Promise<{ ok: true } | { ok: false, error: string }>
       description: ok true on success; otherwise ok false with a message the login screen can show
*/
export async function adminLogin(email, password) {
    let res;
    try {
        res = await fetch(`${API_BASE}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    } catch {
        return { ok: false, error: "Can't reach the server. Is it running?" };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Sign-in failed." };
    try { window.sessionStorage.setItem(KEY, data.email); } catch { /* ignore */ }
    return { ok: true };
}