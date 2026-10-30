/*
Purpose: Lets users choose how the bathrooms of a building are sorted (rating or floor) and in which direction.
Dependencies:
         JSX: NULL
         CSS: stylesheets/building.css
         JS: NULL
*/

// imports
import { useEffect, useRef, useState } from "react";
import "../stylesheets/building.css";

export const SORT_OPTIONS = [
    { value: "rating", label: "Rating" },
    { value: "floor", label: "Floor" },
];

/*
Purpose: Shows the 'Sort by' dropdown and the ASC / DESC toggle, and reports the user's choices to the parent.
Parameters:
       sortKey: currently selected sort option ("rating" or "floor")
       order: current direction ("asc" or "desc")
       onSortKeyChange: called with the new sort option when one is picked
       onOrderChange: called with the new direction when the toggle is clicked
Return value:
       type: JSX.Element
       description: the sort controls
*/
function SortControls({ sortKey, order, onSortKeyChange, onOrderChange }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    // Click outside or Escape closes the dropdown.
    useEffect(() => {
        if (!open) return;
        /*
        Purpose: Closes the dropdown when the user clicks outside of it.
        Parameters:
               e: pointerdown event used to find where the click happened
        Return value:
               type: void
               description: NULL
        */
        const onPointer = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        /*
        Purpose: Closes the dropdown when the Escape key is pressed.
        Parameters:
               e: keydown event holding the pressed key
        Return value:
               type: void
               description: NULL
        */
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const current = SORT_OPTIONS.find((o) => o.value === sortKey) ?? SORT_OPTIONS[0];
    const asc = order === "asc";

    return (
        <div className="sort-controls">
            <div className="sort-dropdown" ref={wrapRef}>
                <button
                    type="button"
                    className="sort-button"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                    <span>Sort by: {current.label}</span>
                    <span className={`sort-caret${open ? " is-open" : ""}`} aria-hidden="true">▾</span>
                </button>

                {open && (
                    <ul className="sort-menu" role="listbox" aria-label="Sort by">
                        {SORT_OPTIONS.map((o) => (
                            <li key={o.value} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={o.value === sortKey}
                                    className={`sort-option${o.value === sortKey ? " is-selected" : ""}`}
                                    onClick={() => {
                                        onSortKeyChange(o.value);
                                        setOpen(false);
                                    }}
                                >
                                    {o.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                type="button"
                className="sort-button sort-order"
                aria-label={`Sort order: ${asc ? "ascending" : "descending"}. Click to switch.`}
                onClick={() => onOrderChange(asc ? "desc" : "asc")}
            >
                <span aria-hidden="true">{asc ? "↑" : "↓"}</span>
                <span>{asc ? "ASC" : "DESC"}</span>
            </button>
        </div>
    );
}

export default SortControls;