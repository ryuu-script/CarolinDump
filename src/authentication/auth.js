/*
Purpose: Handles Google sign-in for students, limited to university accounts.
Dependencies: NULL
*/
import { useSyncExternalStore } from "react";

export const ALLOWED_DOMAIN = "usc.edu.ph";
export const CALLBACK_PATH = "/auth/callback";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const USER_KEY = "carolindump.user";
const NONCE_KEY = "carolindump.nonce";
const CHANGE_EVENT = "carolindump:auth";
const DEFAULT_RETURN = "/student";

/*
Purpose: Safely reads a value from localStorage so a blocked or unavailable storage never crashes the app.
Parameters:
       key: the localStorage key to read
Return value:
       type: string | null
       description: the stored value, or null when missing or when storage throws
*/
const read = (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
};
/*
Purpose: Safely writes a value to localStorage, silently ignoring storage errors.
Parameters:
       key: the localStorage key to write
       value: the string to store
Return value: NULL
       type: NULL
       description: NULL
*/
const write = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
};
/*
Purpose: Safely removes a value from localStorage, silently ignoring storage errors.
Parameters:
       key: the localStorage key to remove
Return value: NULL
       type: NULL
       description: NULL
*/
const remove = (key) => {
    try { window.localStorage.removeItem(key); } catch { /* ignore */ }
};

/*
Purpose: Checks that an email is a university account ("name@usc.edu.ph"), matching the exact domain.
Parameters:
       email: the email address to check (anything that is not a string is rejected)
Return value:
       type: boolean
       description: true only when the email has exactly one "@", a non-empty name, and the allowed domain
*/
export function isCarolinian(email) {
    if (typeof email !== "string") return false;
    const parts = email.trim().toLowerCase().split("@");
    return parts.length === 2 && parts[0].length > 0 && parts[1] === ALLOWED_DOMAIN;
}

/*
Purpose: Allows only in-app paths as redirect targets.
Parameters:
       p: the requested path, e.g. from the sign-in state value
Return value:
       type: string
       description: p when it is a safe in-app path, otherwise the default dashboard path
*/
const safePath = (p) =>
    p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith(CALLBACK_PATH) ? p : DEFAULT_RETURN;

/*
Purpose: Generates a random one-time nonce so a sign-in response can be matched to the request that started it.
Parameters: NULL
Return value:
       type: string
       description: 32-character hex string built from 16 cryptographically random bytes
*/
const randomId = () => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

let cachedRaw;
let cachedUser = null;

/*
Purpose: Reads the signed-in user from storage.
Parameters: NULL
Return value:
       type: { email: string, name: string, picture: string, idToken?: string, exp?: number } | null
       description: the stored user if valid and from the allowed domain, otherwise null (guest)
*/
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

/*
Purpose: Checks whether a signed-in user holds an unexpired Google ID token that the API server can verify.
Parameters:
       user: user object returned by useUser(), or null
Return value:
       type: boolean
       description: true when user has a valid Carolinian email and an unexpired idToken
*/
export function hasValidSession(user) {
    return Boolean(
        user &&
        isCarolinian(user.email) &&
        typeof user.idToken === "string" &&
        user.idToken.length > 0 &&
        typeof user.exp === "number" &&
        user.exp * 1000 > Date.now()
    );
}

/*
Purpose: Lets React re-render when the signed-in user changes, either in this tab or in another one.
Parameters:
       callback: function React calls whenever the stored user may have changed
Return value:
       type: function
       description: cleanup function that removes the event listeners
*/
function subscribe(callback) {
    const onStorage = (e) => (e.key === null || e.key === USER_KEY) && callback();
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, callback);
    return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(CHANGE_EVENT, callback);
    };
}

/*
Purpose: React hook that gives components the current signed-in user and updates them when it changes.
Parameters: NULL
Return value:
       type: { email: string, name: string, picture: string, idToken?: string, exp?: number } | null
       description: the signed-in user, or null for a guest
*/
export const useUser = () => useSyncExternalStore(subscribe, readUser, () => null);

/*
Purpose: Saves the signed-in user to storage and notifies the current tab that the user changed.
Parameters:
       user: { email, name, picture, idToken, exp } object to store
Return value: NULL
       type: NULL
       description: NULL
*/
function saveUser(user) {
    write(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/*
Purpose: Signs the student out by clearing the stored user and notifying the current tab.
Parameters: NULL
Return value: NULL
       type: NULL
       description: NULL
*/
export function signOut() {
    remove(USER_KEY);
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

/*
Purpose: Opens Google's sign-in page in a new tab (or this tab if blocked). Call it from a click handler.
Parameters:
       returnTo: in-app path of the dashboard the sign-in tab should land on afterwards (defaults to the student dashboard)
Return value:
       type: { ok: boolean, reason?: string }
       description: ok true once sign-in was started; ok false with reason "missing-client-id" when no Google client id is configured
*/
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
        prompt: "select_account",
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

    if (!window.open(url, "_blank")) window.location.assign(url);
    return { ok: true };
}

/*
Purpose: Decodes the payload of Google's ID token so its claims can be checked. It does not verify a signature.
Parameters:
       token: the JWT string returned by Google
Return value:
       type: Object | null
       description: the token's claims, or null when the token is malformed
*/
function decodeJwt(token) {
    try {
        const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

/*
Purpose: Decides whether Google's sign-in response is trustworthy and from a university account, and saves the user when it is.
Parameters:
       params: URLSearchParams parsed from Google's response (id_token, error)
       to: safe in-app path to send the person to afterwards
Return value:
       type: { status: "ok" | "rejected" | "cancelled" | "error", to: string }
       description: the outcome of the sign-in and where to go next
*/
function evaluate(params, to) {
    if (params.get("error")) return { status: "cancelled", to };

    const idToken = params.get("id_token") ?? "";
    const claims = decodeJwt(idToken);
    const nonce = read(NONCE_KEY);
    remove(NONCE_KEY);

    const trusted =
        claims &&
        (claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com") &&
        claims.aud === CLIENT_ID &&
        typeof claims.exp === "number" && claims.exp * 1000 > Date.now() &&
        nonce && claims.nonce === nonce;
    if (!trusted) return { status: "error", to };

    if (claims.email_verified !== true || !isCarolinian(claims.email)) return { status: "rejected", to };

    saveUser({
        email: claims.email.toLowerCase(),
        name: claims.name ?? "",
        picture: claims.picture ?? "",
        idToken,
        exp: claims.exp,
    });
    return { status: "ok", to };
}

let callbackResult = null;

/*
Purpose: Finishes sign-in on the callback page: reads Google's answer, saves the user on success, and clears the token from the URL.
Parameters: NULL
Return value:
       type: { status: "ok" | "rejected" | "cancelled" | "error", to: string }
       description: the sign-in outcome and the in-app path to continue to
*/
export function completeSignIn() {
    if (callbackResult) return callbackResult;

    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    callbackResult = evaluate(params, safePath(params.get("state")));

    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    return callbackResult;
}
