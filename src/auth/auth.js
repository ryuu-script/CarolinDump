import { useSyncExternalStore } from "react";

// Only accounts on this domain may log in.
export const ALLOWED_DOMAIN = "usc.edu.ph";
export const CALLBACK_PATH = "/auth/callback";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const USER_KEY = "carolindump.user";
const NONCE_KEY = "carolindump.nonce";
const CHANGE_EVENT = "carolindump:auth";
const DEFAULT_RETURN = "/student";

// ---------- small helpers ----------

// localStorage can throw (private mode, blocked cookies), so every use goes through these.
const read = (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
};
const remove = (key) => {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
};

// "name@usc.edu.ph" only. Compares the exact domain, so "usc.edu.ph.evil.com" and "x@usc.edu.ph@evil.com" fail.
export function isCarolinian(email) {
    if (typeof email !== "string") return false;
    const parts = email.trim().toLowerCase().split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1] === ALLOWED_DOMAIN;
}

// Only in-app paths, so a crafted link can't bounce people to another site.
const safePath = (p) =>
    p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith(CALLBACK_PATH) ? p : DEFAULT_RETURN;

const randomId = () => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

// ---------- the signed-in user (shared between tabs) ----------

let cachedRaw;
let cachedUser = null;

// Returns the same object until the stored value changes, which useSyncExternalStore needs.
function readUser() {
    const raw = read(USER_KEY);
    if (raw === cachedRaw) return cachedUser;
    cachedRaw = raw;
    try {
        const user = raw ? JSON.parse(raw) : null;
        cachedUser = user && isCarolinian(user.email) ? user : null;
    } catch {
        cachedUser = null;
    }
    return cachedUser;
}

function subscribe(callback) {
    // "storage" fires in the OTHER tabs, which is how the dashboard notices a login finished in the sign-in tab.
    const onStorage = (e) => (e.key === null || e.key === USER_KEY) && callback();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, callback); // same-tab changes
    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(CHANGE_EVENT, callback);
    };
}

// { email, name, picture } or null (guest).
export const useUser = () => useSyncExternalStore(subscribe, readUser, () => null);

function saveUser(user) {
    write(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function signOut() {
    remove(USER_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

// ---------- step 1: open Google's sign-in page in another tab ----------

// Call this straight from a click handler, or the browser may block the new tab.
// `returnTo` is the dashboard the sign-in tab should land on afterwards.
export function startSignIn(returnTo = DEFAULT_RETURN) {
    if (!CLIENT_ID) return { ok: false, reason: "missing-client-id" };

    const nonce = randomId();
    write(NONCE_KEY, nonce);

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: `${window.location.origin}${CALLBACK_PATH}`,
        response_type: "id_token",
        scope: "openid email profile",
        nonce,
        state: safePath(returnTo),
        prompt: "select_account", // always show the account picker
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    // If the browser blocks the new tab, sign in on this one instead.
    if (!window.open(url, "_blank")) window.location.assign(url);
    return { ok: true };
}

// ---------- step 2: Google sends the person back to /auth/callback ----------

function decodeJwt(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

function evaluate(params, to) {
    if (params.get("error")) return { status: "cancelled", to };

    const claims = decodeJwt(params.get("id_token") ?? "");
    const nonce = read(NONCE_KEY);
    remove(NONCE_KEY); // one use only

    const trusted =
        claims &&
        (claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com") &&
        claims.aud === CLIENT_ID &&
        typeof claims.exp === "number" && claims.exp * 1000 > Date.now() &&
        nonce && claims.nonce === nonce;
    if (!trusted) return { status: "error", to };

    // A real, verified Google account, but not a university one.
    if (claims.email_verified !== true || !isCarolinian(claims.email)) return { status: "rejected", to };

    saveUser({
        email: claims.email.toLowerCase(),
        name: claims.name ?? "",
        picture: claims.picture ?? "",
    });
    return { status: "ok", to };
}

let callbackResult = null;

// Reads Google's answer from the URL, decides, and (on success) saves the user.
// Cached, because React StrictMode runs effects twice in development and the nonce is single-use.
// Returns { status: "ok" | "rejected" | "cancelled" | "error", to }.
export function completeSignIn() {
    if (callbackResult) return callbackResult;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    callbackResult = evaluate(params, safePath(params.get("state")));

    // Take the token out of the address bar.
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    return callbackResult;
}