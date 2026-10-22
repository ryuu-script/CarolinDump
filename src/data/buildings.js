// Which building code (the `building` column in the database) belongs to which building.
// The key is the building `id` used by CampusMap (and the URL: /building/:buildingId).
// `code` is the value stored in the database's `building` column (and sent to the API).
export const BUILDINGS = {
    lb:     { code: "LB",     name: "Fr. Lawrence Bunzel Building" },
    af:     { code: "AF",     name: "Safad Building" },
    mr:     { code: "MR",     name: "Michael Richartz Center" },
    church: { code: "CHURCH", name: "St. Arnold Janssen and St. Joseph Freinademetz Church" },
    jb:     { code: "JB",     name: "Joseph Baumgartner Learning Resource Center" },
    es:     { code: "ES",     name: "Enrique Shoenig" },
    fo:     { code: "FO",     name: "Franz Oster" },
    eo:     { code: "EO",     name: "Edgar Oehler" },
    sm:     { code: "SM",     name: "SMED Building" },
    pe:     { code: "PE",     name: "Philip Van Engelen Building" },
    rh:     { code: "RH",     name: "Robert Hoeppener Building" },
};

// Returns { code, name } for a building id, or null when the id is unknown.
export const getBuilding = (id) => BUILDINGS[String(id ?? "").toLowerCase()] ?? null;