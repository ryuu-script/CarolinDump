import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BathroomCard from "../components/BathroomCard.jsx";
import SortControls from "../components/SortControls.jsx";
import { fetchBathrooms } from "../api/bathrooms.js";
import { getBuilding } from "../data/buildings.js";
import "../stylesheets/currentbuilding.css";

// The floor is the first digit of the room code: LB446 -> 4, RH346 -> 3.
// Codes without a digit have no floor and always go to the end of the list.
const floorOf = (code) => {
    const digit = /\d/.exec(code);
    return digit ? Number(digit[0]) : null;
};

const compareCodes = (a, b) =>
    a.room_code.localeCompare(b.room_code, undefined, { numeric: true, sensitivity: "base" });

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

// Shows every bathroom of the building picked on the campus map (/building/:buildingId).
function CurrentBuilding() {
    const { buildingId } = useParams();
    const navigate = useNavigate();
    const building = getBuilding(buildingId);

    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0); // bump to retry
    const [sortKey, setSortKey] = useState("rating");
    const [order, setOrder] = useState("desc");

    // Fetch the matching table whenever the chosen building changes.
    useEffect(() => {
        if (!building) return;
        const controller = new AbortController();
        setStatus("loading");

        fetchBathrooms(buildingId, { signal: controller.signal })
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
    }, [buildingId, building, attempt]);

    const sorted = useMemo(() => sortRows(rows, sortKey, order), [rows, sortKey, order]);

    // Back goes to the previous page (the map). If the page was opened directly, go home.
    const goBack = () => (window.history.state?.idx > 0 ? navigate(-1) : navigate("/"));

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
                <button type="button" className="building-button building-back" onClick={goBack}>
                    ← Map
                </button>
                <div className="building-heading">
                    <h1 className="building-title">{building.table.toUpperCase()}</h1>
                    <p className="building-subtitle">{building.name}</p>
                </div>
            </header>

            <div className="building-toolbar">
                <p className="building-count" aria-live="polite">
                    {status === "ready" && `${rows.length} ${rows.length === 1 ? "bathroom" : "bathrooms"}`}
                </p>
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
                        <BathroomCard key={`${row.room_code}-${i}`} index={i} {...row} />
                    ))}
                </section>
            )}
        </main>
    );
}

export default CurrentBuilding;