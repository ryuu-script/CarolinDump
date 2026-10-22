// Admin sign-in: the server checks the email + password against the admins table.
// The result is kept in sessionStorage, so it ends when the tab closes.
// NOTE: this only gates the screens. Any future admin API route must verify on the server too.
const KEY = "carolindump.admin";

export const getAdmin = () => {
    try { return window.sessionStorage.getItem(KEY); } catch { return null; }
};

export const signOutAdmin = () => {
    try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
};

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

// Resolves { ok: true } or { ok: false, error }.
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