/*
Purpose: Dedicated page where verified USC (@usc.edu.ph) students rate and review campus comfort room units.
Dependencies:
         JSX: NULL
         CSS: stylesheets/submit_review.css
         JS: authentication/auth.js, data/buildings.js, server-api/bathrooms.js, server-api/reviews.js
*/

// imports
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
    ALLOWED_DOMAIN,
    hasValidSession,
    signOut,
    startSignIn,
    useUser,
} from "../authentication/auth.js";
import { BUILDINGS, getBuilding } from "../data/buildings.js";
import { fetchBathrooms } from "../../server-api/bathrooms.js";
import { MAX_COMMENT_LENGTH, submitReview } from "../../server-api/reviews.js";
import guestPfp from "../assets/pfp_guest.png";
import "../stylesheets/submit_review.css";

const MAX_RATING = 5;

const RATING_LABELS = {
    1: "1/5 — Avoid if possible",
    2: "2/5 — Needs maintenance",
    3: "3/5 — Usable / Average",
    4: "4/5 — Clean & comfortable",
    5: "5/5 — Spotless gem!",
};

const BUILDING_OPTIONS = Object.entries(BUILDINGS).map(([id, info]) => ({
    value: id,
    label: `${info.code} — ${info.name}`,
}));

const MISSING_CLIENT_ID = "Google sign-in isn't set up yet. Add VITE_GOOGLE_CLIENT_ID to your .env file.";

/*
Purpose: Builds a stable string key that uniquely identifies a comfort room unit row within a building.
Parameters:
       unitRow: normalized bathroom row ({ id, room_code, unit })
Return value:
       type: string
       description: unique option value for the unit dropdown
*/
const unitKeyOf = (unitRow) =>
    Number.isInteger(unitRow.id) && unitRow.id > 0
        ? `id:${unitRow.id}`
        : `rc:${unitRow.room_code}|${unitRow.unit}`;

/*
Purpose: Reads prefill information passed from a bathroom card via router state or URL query parameters.
Parameters:
       location: React Router location object
       searchParams: URLSearchParams from the current URL
Return value:
       type: Object
       description: normalized prefill target and lock status
*/
function extractPrefill(location, searchParams) {
    const statePrefill = location.state?.prefill;
    const rawBuilding = String(statePrefill?.buildingId ?? searchParams.get("building") ?? "")
        .trim()
        .toLowerCase();
    const validBuilding = rawBuilding && getBuilding(rawBuilding) ? rawBuilding : "";
    const hadInvalidBuilding = Boolean(rawBuilding && !validBuilding);

    const rawId = Number(statePrefill?.bathroomId ?? searchParams.get("bathroom"));
    const bathroomId = Number.isInteger(rawId) && rawId > 0 ? rawId : null;
    const roomCode = String(statePrefill?.room_code ?? searchParams.get("room") ?? "").trim();
    const unitName = String(statePrefill?.unit ?? searchParams.get("unit") ?? "").trim();
    const hasUnitTarget = Boolean(bathroomId || (roomCode && unitName));

    const lockedParam = searchParams.get("locked");
    const locked = Boolean(
        validBuilding &&
        hasUnitTarget &&
        (statePrefill?.locked === true || lockedParam === "1" || (statePrefill?.locked !== false && lockedParam !== "0"))
    );

    return {
        buildingId: validBuilding,
        bathroomId,
        roomCode,
        unitName,
        hasUnitTarget,
        locked,
        hadInvalidBuilding,
    };
}

/*
Purpose: Draws one Stephen's Ruby gem SVG icon in either earned (filled) or muted state.
Parameters:
       on: true when the ruby is active/filled
Return value:
       type: JSX.Element
       description: the ruby gem SVG
*/
function RubyGem({ on }) {
    return (
        <svg
            className={`submit-ruby-svg ${on ? "is-on" : "is-off"}`}
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
        >
            <path className="ruby-body" d="M7 3h10l5 6-10 12L2 9z" />
            <path className="ruby-light" d="M7 3h10l-2.5 6h-5z" />
            <path className="ruby-light-soft" d="M7 3 9.5 9H2z" />
            <path className="ruby-shade" d="M17 3l5 6h-7.5zM9.5 9h5L12 21z" />
        </svg>
    );
}

/*
Purpose: Shows the user's profile picture with a safe fallback to the guest avatar.
Parameters:
       src: profile image URL, if available
Return value:
       type: JSX.Element
       description: avatar image element
*/
function UserAvatar({ src }) {
    const [broken, setBroken] = useState(false);
    const activeSrc = !src || broken ? guestPfp : src;
    return (
        <img
            className="submit-user-avatar"
            src={activeSrc}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
        />
    );
}

/*
Purpose: Accessible Catppuccin-themed dropdown listbox that prevents arbitrary text entry.
Parameters:
       labelId: DOM id of the associated field label
       value: currently selected option value
       options: array of { value, label, sublabel } choices
       placeholder: text shown when value does not match an option
       disabled: disables opening or changing the dropdown
       locked: true when prefilled from a comfort room card and fixed for this submission
       accent: Catppuccin accent variable name ("blue", "peach", etc.)
       onChange: callback invoked with the newly chosen option value
Return value:
       type: JSX.Element
       description: the custom dropdown button and listbox menu
*/
function SelectDropdown({
    labelId,
    value,
    options,
    placeholder,
    disabled = false,
    locked = false,
    accent = "blue",
    onChange,
}) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const isOpen = open && !disabled;

    useEffect(() => {
        if (!isOpen) return;
        /*
        Purpose: Closes the dropdown menu when clicking outside of it.
        Parameters:
               e: pointerdown event
        Return value:
               type: void
               description: NULL
        */
        const onPointer = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        /*
        Purpose: Closes the dropdown menu when Escape is pressed.
        Parameters:
               e: keydown event
        Return value:
               type: void
               description: NULL
        */
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("pointerdown", onPointer);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            window.removeEventListener("keydown", onKey);
        };
    }, [isOpen]);

    const selectedOption = options.find((o) => o.value === value) ?? null;
    const displayText = selectedOption ? selectedOption.label : placeholder;
    const isPlaceholder = !selectedOption && !locked;

    return (
        <div
            className={`submit-dropdown${isOpen ? " is-open" : ""}`}
            ref={wrapRef}
            style={{ "--hue": `var(--${accent})` }}
        >
            <button
                type="button"
                className={`submit-select-btn${isPlaceholder ? " is-placeholder" : ""}${locked ? " is-locked" : ""}`}
                style={{ "--hue": `var(--${accent})` }}
                aria-labelledby={labelId}
                aria-haspopup="listbox"
                aria-expanded={disabled ? undefined : isOpen}
                disabled={disabled}
                onClick={() => !disabled && setOpen((o) => !o)}
            >
                <span className="submit-select-text">{displayText}</span>
                <span className={`submit-select-icon${isOpen ? " is-open" : ""}`} aria-hidden="true">
                    {locked ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="11" width="16" height="10" rx="2" />
                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                        </svg>
                    )}
                </span>
            </button>

            {isOpen && (
                <ul className="submit-select-menu" role="listbox" aria-labelledby={labelId}>
                    {options.map((opt) => {
                        const selected = opt.value === value;
                        return (
                            <li key={opt.value} role="presentation">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    className={`submit-select-option${selected ? " is-selected" : ""}`}
                                    style={{ "--hue": `var(--${accent})` }}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                >
                                    <span>{opt.label}</span>
                                    {opt.sublabel && <span className="submit-select-option-sub">{opt.sublabel}</span>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

/*
Purpose: Interactive 1-to-5 Stephen's Rubies rating selector with mouse hover preview and keyboard arrow support.
Parameters:
       labelId: DOM id of the associated rating label
       value: selected rating (0 when none chosen yet, or 1..5)
       disabled: disables rating changes while submitting
       onChange: callback invoked with the chosen rating (1..5)
Return value:
       type: JSX.Element
       description: the interactive ruby rating control
*/
function RubyRatingInput({ labelId, value, disabled = false, onChange }) {
    const [hovered, setHovered] = useState(0);
    const activeRating = hovered || value;

    /*
    Purpose: Moves the selected ruby rating with Left/Right/Up/Down arrow keys.
    Parameters:
           e: keydown event
           current: rating number of the focused button (1..5)
    Return value:
           type: void
           description: NULL
    */
    const handleKeyDown = (e, current) => {
        if (disabled) return;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            onChange(Math.min(MAX_RATING, (value || current) + 1));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            onChange(Math.max(1, (value || current) - 1));
        }
    };

    return (
        <div className="submit-rubies-box">
            <div
                className="submit-rubies-group"
                role="radiogroup"
                aria-labelledby={labelId}
                onMouseLeave={() => setHovered(0)}
            >
                {Array.from({ length: MAX_RATING }, (_, idx) => {
                    const score = idx + 1;
                    const checked = value === score;
                    return (
                        <button
                            key={score}
                            type="button"
                            role="radio"
                            aria-checked={checked}
                            aria-label={`${score} out of ${MAX_RATING} Rubies`}
                            className="submit-ruby-btn"
                            disabled={disabled}
                            onMouseEnter={() => !disabled && setHovered(score)}
                            onClick={() => onChange(score)}
                            onKeyDown={(e) => handleKeyDown(e, score)}
                        >
                            <RubyGem on={score <= activeRating} />
                        </button>
                    );
                })}
            </div>

            <span className={`submit-rating-caption${activeRating === 0 ? " is-empty" : ""}`} aria-live="polite">
                {activeRating > 0 ? RATING_LABELS[activeRating] : "Tap a ruby to rate (1–5)"}
            </span>
        </div>
    );
}

/*
Purpose: Inner Submit Review workspace keyed to the current route query so prefilled and manual flows initialize cleanly.
Parameters:
       initialPrefill: parsed prefill object from router state and URL search parameters
Return value:
       type: JSX.Element
       description: the Submit Review page content
*/
function SubmitReviewView({ initialPrefill }) {
    const navigate = useNavigate();
    const location = useLocation();

    const user = useUser();
    const sessionValid = hasValidSession(user);

    const buildingLabelId = useId();
    const unitLabelId = useId();
    const ratingLabelId = useId();
    const commentId = useId();

    const pendingPrefillRef = useRef(
        initialPrefill.buildingId && initialPrefill.hasUnitTarget ? initialPrefill : null
    );

    const [buildingId, setBuildingId] = useState(initialPrefill.buildingId);
    const [units, setUnits] = useState([]);
    const [unitsStatus, setUnitsStatus] = useState(initialPrefill.buildingId ? "loading" : "idle");
    const [unitsError, setUnitsError] = useState("");
    const [fetchAttempt, setFetchAttempt] = useState(0);

    const [selectedUnitKey, setSelectedUnitKey] = useState("");
    const [isLocked, setIsLocked] = useState(initialPrefill.locked);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(
        initialPrefill.hadInvalidBuilding
            ? "We couldn't find that building. Please select a valid campus building below."
            : ""
    );
    const [authError, setAuthError] = useState("");
    const [needsReauth, setNeedsReauth] = useState(false);
    const [submittedReview, setSubmittedReview] = useState(null);

    // Load comfort room units dynamically whenever the selected building changes.
    useEffect(() => {
        if (!buildingId) return;

        const controller = new AbortController();

        fetchBathrooms(buildingId, { signal: controller.signal })
            .then((data) => {
                setUnits(data);
                setUnitsStatus("ready");

                const prefill = pendingPrefillRef.current;
                if (prefill && prefill.buildingId === buildingId && prefill.hasUnitTarget) {
                    pendingPrefillRef.current = null;
                    const matched = data.find((u) => {
                        if (prefill.bathroomId) {
                            if (u.id !== prefill.bathroomId) return false;
                            if (prefill.roomCode && u.room_code !== prefill.roomCode) return false;
                            if (prefill.unitName && u.unit !== prefill.unitName) return false;
                            return true;
                        }
                        return u.room_code === prefill.roomCode && u.unit === prefill.unitName;
                    });

                    if (matched) {
                        setSelectedUnitKey(unitKeyOf(matched));
                        setIsLocked(Boolean(prefill.locked));
                    } else {
                        setSelectedUnitKey("");
                        setIsLocked(false);
                        setError(
                            "The prefilled comfort room unit could not be found in this building. Please select an available unit."
                        );
                    }
                }
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                setUnits([]);
                setUnitsStatus("error");
                setUnitsError(err.message || "Could not load comfort room units.");
            });

        return () => controller.abort();
    }, [buildingId, fetchAttempt]);

    const selectedBuilding = getBuilding(buildingId);

    const unitDropdownOptions = useMemo(
        () =>
            units.map((u) => ({
                value: unitKeyOf(u),
                label: `${u.room_code} — ${u.unit}`,
                sublabel: `Current rating: ${u.rating}/${MAX_RATING} Rubies`,
            })),
        [units]
    );

    const selectedUnit = useMemo(
        () => units.find((u) => unitKeyOf(u) === selectedUnitKey) ?? null,
        [units, selectedUnitKey]
    );

    /*
    Purpose: Navigates back to the previous page, or to the student campus map when opened directly.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const goBack = () => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else if (buildingId) {
            navigate(`/building/${buildingId}`);
        } else {
            navigate("/student");
        }
    };

    /*
    Purpose: Starts Google OAuth sign-in, preserving the current Submit Review URL and any prefilled parameters.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleGoogleSignIn = () => {
        const returnTo = `${location.pathname}${location.search}`;
        const { ok } = startSignIn(returnTo);
        setAuthError(ok ? "" : MISSING_CLIENT_ID);
        if (ok) setNeedsReauth(false);
    };

    /*
    Purpose: Updates the selected building in manual mode and resets any previously selected comfort room unit.
    Parameters:
           nextBuildingId: chosen building id (e.g. "lb")
    Return value:
           type: void
           description: NULL
    */
    const handleBuildingChange = useCallback(
        (nextBuildingId) => {
            if (isLocked || nextBuildingId === buildingId) return;
            pendingPrefillRef.current = null;
            setBuildingId(nextBuildingId);
            setSelectedUnitKey("");
            setUnits([]);
            setUnitsError("");
            setUnitsStatus(nextBuildingId ? "loading" : "idle");
            setError("");
        },
        [buildingId, isLocked]
    );

    /*
    Purpose: Updates the selected comfort room unit in manual mode.
    Parameters:
           nextUnitKey: chosen unit key from the unit dropdown
    Return value:
           type: void
           description: NULL
    */
    const handleUnitChange = useCallback(
        (nextUnitKey) => {
            if (isLocked) return;
            setSelectedUnitKey(nextUnitKey);
            setError("");
        },
        [isLocked]
    );

    /*
    Purpose: Retries loading comfort room units for the selected building after a network error.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleRetryUnits = () => {
        if (!buildingId) return;
        setUnitsError("");
        setUnitsStatus("loading");
        setFetchAttempt((n) => n + 1);
    };

    /*
    Purpose: Resets the form after a successful submission so the student can submit another review.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleResetForAnother = () => {
        setSubmittedReview(null);
        setRating(0);
        setComment("");
        setError("");
        setIsLocked(false);
        setSelectedUnitKey("");
        if (location.search) {
            navigate("/reviews/submit", { replace: true });
        }
    };

    /*
    Purpose: Validates the review fields and submits the review to the backend API.
    Parameters:
           e: form submit event
    Return value:
           type: Promise<void>
           description: resolves once submission finishes or displays an error
    */
    async function handleSubmit(e) {
        e.preventDefault();
        if (submitting) return;
        setError("");
        setAuthError("");

        if (!user || !sessionValid) {
            setNeedsReauth(true);
            setError(`Please sign in with your @${ALLOWED_DOMAIN} Google account before submitting.`);
            return;
        }

        if (!selectedBuilding) {
            setError("Please select a campus building.");
            return;
        }

        if (unitsStatus !== "ready" || !selectedUnit) {
            setError("Please select a valid comfort room unit for this building.");
            return;
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > MAX_RATING) {
            setError("Please select a Stephen's Rubies rating from 1 to 5.");
            return;
        }

        const trimmedComment = comment.trim();
        if (!trimmedComment) {
            setError("Please enter a short review message describing the comfort room.");
            return;
        }
        if (trimmedComment.length > MAX_COMMENT_LENGTH) {
            setError(`Review message must be ${MAX_COMMENT_LENGTH} characters or fewer.`);
            return;
        }

        setSubmitting(true);
        const result = await submitReview({
            building: selectedBuilding.code,
            bathroomId: selectedUnit.id,
            room_code: selectedUnit.room_code,
            unit: selectedUnit.unit,
            rating,
            comment: trimmedComment,
            idToken: user.idToken,
        });

        if (!result.ok) {
            if (result.status === 401) {
                setNeedsReauth(true);
            }
            setError(result.error);
            setSubmitting(false);
            return;
        }

        setNeedsReauth(false);
        setSubmittedReview({
            ...result.review,
            buildingId,
            buildingName: selectedBuilding.name,
        });
        setSubmitting(false);
    }

    let unitPlaceholder = "Select a building first";
    if (buildingId) {
        if (unitsStatus === "loading") {
            unitPlaceholder =
                isLocked && initialPrefill.roomCode && initialPrefill.unitName
                    ? `${initialPrefill.roomCode} — ${initialPrefill.unitName}`
                    : "Loading comfort room units…";
        } else if (unitsStatus === "error") {
            unitPlaceholder = "Could not load comfort room units";
        } else if (units.length === 0) {
            unitPlaceholder = "No comfort room units available yet";
        } else {
            unitPlaceholder = "Select a comfort room unit…";
        }
    }

    const unitDropdownDisabled =
        submitting ||
        isLocked ||
        !buildingId ||
        unitsStatus !== "ready" ||
        units.length === 0;

    const canSubmit =
        Boolean(user && sessionValid) &&
        Boolean(selectedBuilding) &&
        unitsStatus === "ready" &&
        Boolean(selectedUnit) &&
        rating >= 1 &&
        rating <= MAX_RATING &&
        comment.trim().length > 0 &&
        comment.length <= MAX_COMMENT_LENGTH &&
        !submitting;

    const prefillPreviewText =
        selectedBuilding && (selectedUnit || (initialPrefill.roomCode && initialPrefill.unitName))
            ? `${selectedBuilding.code} · ${
                  selectedUnit
                      ? `${selectedUnit.room_code} — ${selectedUnit.unit}`
                      : `${initialPrefill.roomCode} — ${initialPrefill.unitName}`
              }`
            : null;

    return (
        <main className="submit-page">
            <div className="submit-topbar">
                <button type="button" className="submit-back-btn" onClick={goBack}>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        focusable="false"
                    >
                        <path d="M19 12H5" />
                        <path d="M12 19l-7-7 7-7" />
                    </svg>
                    <span>Back</span>
                </button>

                <div className={`submit-user-chip${user ? "" : " is-guest"}`}>
                    <UserAvatar key={user?.picture ?? "guest"} src={user?.picture} />
                    <span className="submit-user-email" title={user ? user.email : "Guest"}>
                        {user ? user.email : "Not signed in"}
                    </span>
                    {user && (
                        <button
                            type="button"
                            className="submit-signout-link"
                            onClick={() => {
                                signOut();
                                setSubmittedReview(null);
                            }}
                        >
                            Sign out
                        </button>
                    )}
                </div>
            </div>

            <section className="submit-card" aria-labelledby="submit-review-heading">
                <header className="submit-header">
                    <h1 id="submit-review-heading" className="submit-title">Submit a Review</h1>
                    <p className="submit-subtitle">
                        Rate a campus comfort room with Stephen&apos;s Rubies to help fellow Carolinians.
                    </p>
                </header>

                {!user || !sessionValid ? (
                    <div className="submit-gate">
                        <h2 className="submit-gate-title">
                            {user ? "Verify your USC Google session" : "Sign in with your USC Google account"}
                        </h2>
                        <p className="submit-gate-text">
                            {user
                                ? `Your previous Google session for ${user.email} has expired. Sign in again with your @${ALLOWED_DOMAIN} account so we can verify your review.`
                                : `Only verified University of San Carlos (@${ALLOWED_DOMAIN}) Google accounts can submit comfort room reviews.`}
                        </p>

                        {prefillPreviewText && (
                            <div className="submit-prefill-summary">
                                <span>Selected comfort room:</span>
                                <strong>{prefillPreviewText}</strong>
                            </div>
                        )}

                        {authError && (
                            <div className="submit-alert" role="alert">
                                <span>{authError}</span>
                            </div>
                        )}

                        <div className="submit-actions">
                            <button type="button" className="submit-btn" onClick={goBack}>
                                Back
                            </button>
                            <button type="button" className="submit-btn is-auth" onClick={handleGoogleSignIn}>
                                {user ? "Continue with Google" : "Sign in with Google"}
                            </button>
                        </div>
                    </div>
                ) : submittedReview ? (
                    <div className="submit-success" role="status" aria-live="polite">
                        <div className="submit-success-banner">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M20 6L9 17l-5-5" />
                            </svg>
                            <h2 className="submit-success-title">Review submitted!</h2>
                        </div>

                        <div className="submit-summary-card">
                            <div className="submit-summary-meta">
                                <div>
                                    <p className="submit-summary-place">
                                        {submittedReview.room_code} — {submittedReview.unit}
                                    </p>
                                    <p className="submit-summary-sub">
                                        {submittedReview.buildingName} ({submittedReview.building}) · {submittedReview.user_email}
                                    </p>
                                </div>
                                <div
                                    className="submit-summary-rubies"
                                    role="img"
                                    aria-label={`Rated ${submittedReview.rating} out of ${MAX_RATING} Rubies`}
                                >
                                    {Array.from({ length: MAX_RATING }, (_, i) => (
                                        <RubyGem key={i} on={i < submittedReview.rating} />
                                    ))}
                                </div>
                            </div>
                            <p className="submit-summary-comment">{submittedReview.comment}</p>
                        </div>

                        <div className="submit-actions">
                            <Link className="submit-btn" to="/student">
                                Campus Map
                            </Link>
                            {submittedReview.buildingId && (
                                <Link className="submit-btn" to={`/building/${submittedReview.buildingId}`}>
                                    Back to {submittedReview.building}
                                </Link>
                            )}
                            <button
                                type="button"
                                className="submit-btn is-success"
                                onClick={handleResetForAnother}
                            >
                                Submit Another Review
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="submit-form" onSubmit={handleSubmit} noValidate>
                        <div className="submit-row">
                            <div className="submit-field">
                                <div className="submit-label-row">
                                    <span id={buildingLabelId} className="submit-label">Building</span>
                                    {isLocked && <span className="submit-badge">Prefilled</span>}
                                </div>
                                <SelectDropdown
                                    labelId={buildingLabelId}
                                    value={buildingId}
                                    options={BUILDING_OPTIONS}
                                    placeholder="Select a building…"
                                    disabled={submitting || isLocked}
                                    locked={isLocked}
                                    accent="blue"
                                    onChange={handleBuildingChange}
                                />
                            </div>

                            <div className="submit-field">
                                <div className="submit-label-row">
                                    <span id={unitLabelId} className="submit-label">Comfort Room Unit</span>
                                    {isLocked && <span className="submit-badge">Prefilled</span>}
                                </div>
                                <SelectDropdown
                                    labelId={unitLabelId}
                                    value={selectedUnitKey}
                                    options={unitDropdownOptions}
                                    placeholder={unitPlaceholder}
                                    disabled={unitDropdownDisabled}
                                    locked={isLocked}
                                    accent="peach"
                                    onChange={handleUnitChange}
                                />
                                {unitsStatus === "error" && (
                                    <div className="submit-inline-retry" role="alert">
                                        <span>{unitsError}</span>
                                        <button
                                            type="button"
                                            className="submit-retry-btn"
                                            onClick={handleRetryUnits}
                                        >
                                            Retry
                                        </button>
                                    </div>
                                )}
                                {buildingId && unitsStatus === "ready" && units.length === 0 && (
                                    <p className="submit-hint">
                                        No comfort room units have been added for {selectedBuilding?.code} yet. Choose another building to continue.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="submit-field">
                            <div className="submit-label-row">
                                <span id={ratingLabelId} className="submit-label">Stephen&apos;s Rubies Rating</span>
                            </div>
                            <RubyRatingInput
                                labelId={ratingLabelId}
                                value={rating}
                                disabled={submitting}
                                onChange={(next) => {
                                    setRating(next);
                                    setError("");
                                }}
                            />
                        </div>

                        <div className="submit-field">
                            <div className="submit-label-row">
                                <label htmlFor={commentId} className="submit-label">
                                    Short Description / Review Message
                                </label>
                                <span
                                    className={`submit-char-count${
                                        comment.length >= MAX_COMMENT_LENGTH - 50 ? " is-near-limit" : ""
                                    }`}
                                >
                                    {comment.length}/{MAX_COMMENT_LENGTH}
                                </span>
                            </div>
                            <textarea
                                id={commentId}
                                className="submit-textarea"
                                placeholder="Share how clean it was, whether water, soap, tissue, or flush/bidet worked…"
                                maxLength={MAX_COMMENT_LENGTH}
                                value={comment}
                                disabled={submitting}
                                autoFocus={isLocked}
                                onChange={(e) => {
                                    setComment(e.target.value);
                                    if (error) setError("");
                                }}
                                required
                            />
                        </div>

                        {(error || authError) && (
                            <div className="submit-alert" role="alert" aria-live="polite">
                                <span>{authError || error}</span>
                                {needsReauth && (
                                    <button
                                        type="button"
                                        className="submit-retry-btn"
                                        onClick={handleGoogleSignIn}
                                    >
                                        Sign in again
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="submit-actions">
                            <button
                                type="button"
                                className="submit-btn"
                                disabled={submitting}
                                onClick={goBack}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="submit-btn is-primary"
                                disabled={!canSubmit}
                            >
                                {submitting ? (
                                    <span className="submit-dots" role="status" aria-label="Submitting review">
                                        <span /><span /><span />
                                    </span>
                                ) : (
                                    "Submit Review"
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </main>
    );
}

/*
Purpose: Route-level entry point for /reviews/submit that parses route prefill state and mounts SubmitReviewView.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the Submit Review page
*/
function Submit_Review() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const initialPrefill = useMemo(
        () => extractPrefill(location, searchParams),
        [location, searchParams]
    );

    return (
        <SubmitReviewView
            key={`${location.pathname}${location.search}`}
            initialPrefill={initialPrefill}
        />
    );
}

export default Submit_Review;
