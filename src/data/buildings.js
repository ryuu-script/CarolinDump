/*
Purpose: Maps each campus building id to its database code and display name.
Dependencies: NULL
*/
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

/*
Purpose: Looks up a campus building by its id.
Parameters:
       id: building id (case-insensitive), e.g. "lb"; null/undefined is treated as unknown
Return value:
       type: { code: string, name: string } | null
       description: the matching building, or null when the id is unknown
*/
export const getBuilding = (id) => BUILDINGS[String(id ?? "").toLowerCase()] ?? null;