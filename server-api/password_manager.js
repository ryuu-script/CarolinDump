/*
Purpose: Keeps admin passwords safe: hashes them for storage and verifies login attempts, so plain-text passwords are never stored.
Dependencies: NULL
*/
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/*
Purpose: Turns a password into a salted scrypt hash that is safe to store in the database.
Parameters:
       password: the plain-text password
Return value:
       type: string
       description: the hash in the format scrypt$<salt hex>$<hash hex>
*/
export function hashPassword(password) {
    const salt = randomBytes(16);
    const hash = scryptSync(password, salt, 64);
    return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/*
Purpose: Checks a password against a stored hash without leaking timing information.
Parameters:
       password: the plain-text password to check
       stored: the stored hash string (scrypt$<salt hex>$<hash hex>)
Return value:
       type: boolean
       description: true when the password matches; false on mismatch or when the stored value is malformed
*/
export function verifyPassword(password, stored) {
    const [scheme, saltHex, hashHex] = String(stored ?? "").split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
    return timingSafeEqual(actual, expected);
}

export const DUMMY_HASH = hashPassword("not-a-real-password");