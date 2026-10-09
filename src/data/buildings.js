// Which database table belongs to which building.
// The key is the building `id` used by CampusMap (and the URL: /building/:buildingId).
// `table` is the exact table name in the database.
export const BUILDINGS = {
    lb:     { table: "LB",     name: "Fr. Lawrence Bunzel Building" },
    af:     { table: "AF",     name: "Safad Building" },
    mr:     { table: "MR",     name: "Michael Richartz Center" },
    church: { table: "church", name: "St. Arnold Janssen and St. Joseph Freinademetz Church" },
    jb:     { table: "JB",     name: "Joseph Baumgartner Learning Resource Center" },
    es:     { table: "ES",     name: "Enrique Shoenig" },
    fo:     { table: "FO",     name: "Franz Oster" },
    eo:     { table: "EO",     name: "Edgar Oehler" },
    sm:     { table: "SM",     name: "SMED Building" },
    pe:     { table: "PE",     name: "Philip Van Engelen Building" },
    rh:     { table: "RH",     name: "Robert Hoeppener Building" },
};

// Returns { table, name } for a building id, or null when the id is unknown.
export const getBuilding = (id) => BUILDINGS[String(id ?? "").toLowerCase()] ?? null;