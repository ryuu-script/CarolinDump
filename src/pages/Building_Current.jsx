
/*
Purpose: Lists, searches, filters, and sorts bathrooms in the selected building.
Dependencies:
         JSX: components/Bathroom_Card.jsx, components/Sort_Controls.jsx
         CSS: stylesheets/building.css
         JS: server-api/bathrooms.js, data/buildings.js
*/

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import BathroomCard from "../components/Bathroom_Card.jsx";
import SortControls from "../components/Sort_Controls.jsx";
import { fetchBathrooms } from "../../server-api/bathrooms.js";
import { getBuilding } from "../data/buildings.js";
import "../stylesheets/building.css";

const floorOf = (code) => {
    const digit = /\d/.exec(String(code ?? ""));
    return digit ? Number(digit[0]) : null;
};

const compareCodes = (a, b) =>
    String(a.room_code ?? "").localeCompare(
        String(b.room_code ?? ""),
        undefined,
        { numeric: true, sensitivity: "base" }
    );

function sortRows(rows, key, order) {
    const dir = order === "asc" ? 1 : -1;

    return [...rows].sort((a, b) => {
        let diff = 0;

        if (key === "rating") {
            diff = (Number(a.rating ?? 0) - Number(b.rating ?? 0)) * dir;
        } else {
            const fa = floorOf(a.room_code);
            const fb = floorOf(b.room_code);

            if (fa === null && fb !== null) return 1;
            if (fb === null && fa !== null) return -1;

            diff = ((fa ?? 0) - (fb ?? 0)) * dir;
        }

        return diff !== 0 ? diff : compareCodes(a, b);
    });
}

function Building_Current() {
    const { buildingId } = useParams();
    const navigate = useNavigate();

    const normalizedBuildingId = String(buildingId ?? "").toLowerCase();
    const building = getBuilding(normalizedBuildingId);

    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState("");
    const [attempt, setAttempt] = useState(0);

    const [sortKey, setSortKey] = useState("rating");
    const [order, setOrder] = useState("desc");

    // Search and filter states
    const [search, setSearch] = useState("");
    const [floorFilter, setFloorFilter] = useState("all");
    const [ratingFilter, setRatingFilter] = useState("all");

    useEffect(() => {
        if (!building) return;

        const controller = new AbortController();

        setStatus("loading");
        setError("");
        setRows([]);

        fetchBathrooms(normalizedBuildingId, {
            signal: controller.signal,
        })
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

    // Reset filters when switching buildings
    useEffect(() => {
        setSearch("");
        setFloorFilter("all");
        setRatingFilter("all");
    }, [normalizedBuildingId]);

    // Build available floor options from actual bathroom records
    const availableFloors = useMemo(() => {
        const floors = rows
            .map((row) => floorOf(row.room_code))
            .filter((floor) => floor !== null);

        return [...new Set(floors)].sort((a, b) => a - b);
    }, [rows]);

    // Apply search, floor filter, rating filter, and sorting
    const filteredRows = useMemo(() => {
        const query = search.trim().toLowerCase();

        const matches = rows.filter((row) => {
            const searchableText = [
                row.room_code,
                row.unit,
                building?.name,
                building?.code,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
                !query || searchableText.includes(query);

            const matchesFloor =
                floorFilter === "all" ||
                floorOf(row.room_code) === Number(floorFilter);

            const matchesRating =
                ratingFilter === "all" ||
                (
                    Number.isFinite(Number(row.rating)) &&
                    Number(row.rating) >= Number(ratingFilter)
                );

            return matchesSearch && matchesFloor && matchesRating;
        });

        return sortRows(matches, sortKey, order);
    }, [
        rows,
        search,
        floorFilter,
        ratingFilter,
        sortKey,
        order,
        building,
    ]);

    const hasActiveFilters =
        search.trim() !== "" ||
        floorFilter !== "all" ||
        ratingFilter !== "all";

    const resetFilters = () => {
        setSearch("");
        setFloorFilter("all");
        setRatingFilter("all");
    };

    const goBack = () =>
        window.history.state?.idx > 0
            ? navigate(-1)
            : navigate("/");

    const handleSelectBathroom = useCallback(
        (selectedRow) => {
            if (!building) return;

            const params = new URLSearchParams();

            params.set("building", normalizedBuildingId);

            if (
                Number.isInteger(selectedRow.id) &&
                selectedRow.id > 0
            ) {
                params.set("bathroom", String(selectedRow.id));
            }

            if (selectedRow.room_code) {
                params.set("room", selectedRow.room_code);
            }

            if (selectedRow.unit) {
                params.set("unit", selectedRow.unit);
            }

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
                    <h1 className="building-title">
                        Building not found
                    </h1>

                    <p>
                        We couldn't find a building called
                        {" "}{buildingId}.
                    </p>

                    <Link className="building-button" to="/">
                        Back to start
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main className="building-page">
            <header className="building-header">
                <div className="building-heading">
                    <h1 className="building-title">
                        {building.code.toUpperCase()}
                    </h1>

                    <p className="building-subtitle">
                        {building.name}
                    </p>
                </div>
            </header>

            <div className="building-toolbar">
                <div className="building-toolbar-start">
                    <button
                        type="button"
                        className="building-button building-back"
                        onClick={goBack}
                        aria-label="Back to map"
                    >
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

                    <p
                        className="building-count"
                        aria-live="polite"
                    >
                        {status === "ready" &&
                            `${filteredRows.length} of ${rows.length} ${
                                rows.length === 1
                                    ? "bathroom"
                                    : "bathrooms"
                            }`}
                    </p>
                </div>

                <SortControls
                    sortKey={sortKey}
                    order={order}
                    onSortKeyChange={setSortKey}
                    onOrderChange={setOrder}
                />
            </div>

            {status === "ready" && rows.length > 0 && (
                <section
                    aria-label="Search and filter bathrooms"
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        alignItems: "end",
                        marginBottom: "24px",
                        padding: "18px",
                        borderRadius: "14px",
                        background: "var(--mantle, #181825)",
                        border: "1px solid var(--surface0, #313244)",
                    }}
                >
                    <label
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            flex: "2 1 230px",
                        }}
                    >
                        <span>Search bathrooms</span>

                        <input
                            type="search"
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            placeholder="Search room code or unit..."
                            aria-label="Search bathrooms"
                            style={{
                                width: "100%",
                                padding: "11px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--surface1, #45475a)",
                                background: "var(--base, #1e1e2e)",
                                color: "var(--text, #cdd6f4)",
                                font: "inherit",
                            }}
                        />
                    </label>

                    <label
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            flex: "1 1 135px",
                        }}
                    >
                        <span>Floor</span>

                        <select
                            value={floorFilter}
                            onChange={(e) =>
                                setFloorFilter(e.target.value)
                            }
                            style={{
                                width: "100%",
                                padding: "11px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--surface1, #45475a)",
                                background: "var(--base, #1e1e2e)",
                                color: "var(--text, #cdd6f4)",
                                font: "inherit",
                            }}
                        >
                            <option value="all">
                                All Floors
                            </option>

                            {availableFloors.map((floor) => (
                                <option
                                    key={floor}
                                    value={String(floor)}
                                >
                                    Floor {floor}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            flex: "1 1 145px",
                        }}
                    >
                        <span>Minimum rating</span>

                        <select
                            value={ratingFilter}
                            onChange={(e) =>
                                setRatingFilter(e.target.value)
                            }
                            style={{
                                width: "100%",
                                padding: "11px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--surface1, #45475a)",
                                background: "var(--base, #1e1e2e)",
                                color: "var(--text, #cdd6f4)",
                                font: "inherit",
                            }}
                        >
                            <option value="all">
                                All Ratings
                            </option>
                            <option value="5">
                                5 Rubies
                            </option>
                            <option value="4">
                                4+ Rubies
                            </option>
                            <option value="3">
                                3+ Rubies
                            </option>
                            <option value="2">
                                2+ Rubies
                            </option>
                            <option value="1">
                                1+ Rubies
                            </option>
                        </select>
                    </label>

                    <button
                        type="button"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                        style={{
                            padding: "11px 16px",
                            borderRadius: "8px",
                            border: "1px solid var(--surface1, #45475a)",
                            background: "var(--surface0, #313244)",
                            color: "var(--text, #cdd6f4)",
                            font: "inherit",
                            cursor: hasActiveFilters
                                ? "pointer"
                                : "not-allowed",
                            opacity: hasActiveFilters ? 1 : 0.5,
                        }}
                    >
                        Clear Filters
                    </button>
                </section>
            )}

            {status === "error" && (
                <div
                    className="building-message"
                    role="alert"
                >
                    <p>{error}</p>

                    <button
                        type="button"
                        className="building-button"
                        onClick={() =>
                            setAttempt((n) => n + 1)
                        }
                    >
                        Try again
                    </button>
                </div>
            )}

            {status === "ready" && rows.length === 0 && (
                <p className="building-message">
                    No bathrooms have been added for this
                    building yet.
                </p>
            )}

            {status === "ready" &&
                rows.length > 0 &&
                filteredRows.length === 0 && (
                    <div
                        className="building-message"
                        role="status"
                    >
                        <p>
                            No bathrooms match your search
                            or selected filters.
                        </p>

                        <button
                            type="button"
                            className="building-button"
                            onClick={resetFilters}
                        >
                            Clear Filters
                        </button>
                    </div>
                )}

            {status === "ready" &&
                filteredRows.length > 0 && (
                    <section
                        className="building-grid"
                        aria-label={`Bathrooms in ${building.name}`}
                    >
                        {filteredRows.map((row, i) => (
                            <BathroomCard
                                key={
                                    row.id ??
                                    `${row.room_code}-${row.unit}-${i}`
                                }
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
