/*
Purpose: Lists and sorts all bathrooms of the building chosen on the campus map, and opens Submit Review when a unit card is chosen.
Dependencies:
         JSX: components/Bathroom_Card.jsx, components/Sort_Controls.jsx
         CSS: stylesheets/building.css
         JS: server-api/bathrooms.js, data/buildings.js
*/

// imports
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BathroomCard from "../components/Bathroom_Card.jsx";
import SortControls from "../components/Sort_Controls.jsx";
import { fetchBathrooms } from "../../server-api/bathrooms.js";
import { getBuilding } from "../data/buildings.js";
import "../stylesheets/building.css";

/*
Purpose: Gets the floor number from a room code (first digit).
Parameters:
       code: room code such as LB446
Return value:
       type: number | null
       description: the floor, or null if the code has no digit
*/
const floorOf = (code) => {
    const digit = /\d/.exec(code);
    return digit ? Number(digit[0]) : null;
};

/*
Purpose: Compares two bathrooms by room code in natural order, used to break ties.
Parameters:
       a: first bathroom
       b: second bathroom
Return value:
       type: number
       description: negative, zero or positive sort result
*/
const compareCodes = (a, b) =>
    a.room_code.localeCompare(b.room_code, undefined, { numeric: true, sensitivity: "base" });

/*
Purpose: Returns a sorted copy of the bathrooms by rating or floor.
Parameters:
       rows: list of bathrooms
       key: "rating" or "floor"
       order: "asc" or "desc"
Return value:
       type: array
       description: the sorted bathrooms
*/
function sortRows(rows, key, order) {
    const dir = order === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
        let diff = 0;
        if (key === "rating") {
            diff = (a.rating - b.rating) * dir;
        } else {
            const fa = floorOf(a.room_code);
            const fb = floorOf(b.room_code);
            if (fa === null && fb !== null) return 1;  // no floor: always last
            if (fb === null && fa !== null) return -1;
            diff = ((fa ?? 0) - (fb ?? 0)) * dir;
        }
        // Ties keep a stable, readable order (by room code, always A-Z).
        return diff !== 0 ? diff : compareCodes(a, b);
    });
}

/*
Purpose: Loads and shows every bathroom of the building chosen on the campus map, with sorting and error handling.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the building page, or a not-found message
*/
function Building_Current() {
    const { buildingId } = useParams();
    const navigate = useNavigate();
    const normalizedBuildingId = String(buildingId ?? "").toLowerCase();
    const building = getBuilding(normalizedBuildingId);

    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0); // bump to retry
    const [sortKey, setSortKey] = useState("rating");
    const [order, setOrder] = useState("desc");

    // Fetch the matching bathrooms whenever the chosen building changes.
    useEffect(() => {
        if (!building) return;
        const controller = new AbortController();
        setStatus("loading");

        fetchBathrooms(normalizedBuildingId, { signal: controller.signal })
            .then((data) => {
                setRows(data);
                setStatus("ready");
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                setError(err.message || "Something went wrong.");
                setStatus("error");
            });

        return () => controller.abort();
    }, [normalizedBuildingId, building, attempt]);

    const sorted = useMemo(() => sortRows(rows, sortKey, order), [rows, sortKey, order]);

    /*
    Purpose: Goes back to the map, or to the start page if this page was opened directly.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));

    /*
    Purpose: Opens the Submit Review page prefilled and locked to the selected comfort room unit.
    Parameters:
           selectedRow: bathroom card data ({ id, room_code, unit })
    Return value:
           type: void
           description: NULL
    */
    const handleSelectBathroom = useCallback(
        (selectedRow) => {
            if (!building) return;
            const params = new URLSearchParams();
            params.set("building", normalizedBuildingId);
            if (Number.isInteger(selectedRow.id) && selectedRow.id > 0) {
                params.set("bathroom", String(selectedRow.id));
            }
            if (selectedRow.room_code) params.set("room", selectedRow.room_code);
            if (selectedRow.unit) params.set("unit", selectedRow.unit);
            params.set("locked", "1");

            navigate(`/reviews/submit?${params.toString()}`, {
                state: {
                    prefill: {
                        buildingId: normalizedBuildingId,
                        buildingCode: building.code,
                        buildingName: building.name,
                        bathroomId: selectedRow.id ?? null,
                        room_code: selectedRow.room_code,
                        unit: selectedRow.unit,
                        locked: true,
                    },
                },
            });
        },
        [building, navigate, normalizedBuildingId]
    );

    if (!building) {
        return (
            <main className="building-page">
                <div className="building-message">
                    <h1 className="building-title">Building not found</h1>
                    <p>We couldn&apos;t find a building called &ldquo;{buildingId}&rdquo;.</p>
                    <Link className="building-button" to="/">Back to start</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="building-page">
            <header className="building-header">
                <div className="building-heading">
                    <h1 className="building-title">{building.code.toUpperCase()}</h1>
                    <p className="building-subtitle">{building.name}</p>
                </div>
            </header>

            <div className="building-toolbar">
                <div className="building-toolbar-start">
                    <button type="button" className="building-button building-back" onClick={goBack} aria-label="Back to map">
                        <svg
                            className="building-back-icon"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            aria-hidden="true"
                            focusable="false"
                        >
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                    <p className="building-count" aria-live="polite">
                        {status === "ready" && `${rows.length} ${rows.length === 1 ? "bathroom" : "bathrooms"}`}
                    </p>
                </div>
                <SortControls
                    sortKey={sortKey}
                    order={order}
                    onSortKeyChange={setSortKey}
                    onOrderChange={setOrder}
                />
            </div>

            {status === "error" && (
                <div className="building-message" role="alert">
                    <p>{error}</p>
                    <button type="button" className="building-button" onClick={() => setAttempt((n) => n + 1)}>
                        Try again
                    </button>
                </div>
            )}

            {status === "ready" && rows.length === 0 && (
                <p className="building-message">No bathrooms have been added for this building yet.</p>
            )}

            {status === "ready" && rows.length > 0 && (
                <section className="building-grid" aria-label={`Bathrooms in ${building.name}`}>
                    {sorted.map((row, i) => (
                        <BathroomCard
                            key={row.id ?? `${row.room_code}-${row.unit}-${i}`}
                            index={i}
                            buildingId={normalizedBuildingId}
                            building={building}
                            onSelect={handleSelectBathroom}
                            {...row}
                        />
                    ))}
                </section>
            )}
        </main>
    );
}

export default Building_Current;
