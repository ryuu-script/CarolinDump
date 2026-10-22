import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Passwords are never stored as plain text. Format: scrypt$<salt hex>$<hash hex>
export function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
    const [scheme, saltHex, hashHex] = String(stored ?? "").split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(actual, expected);
}

// Used when the email isn't found, so a wrong email takes as long as a wrong password.
export const DUMMY_HASH = hashPassword("not-a-real-password");