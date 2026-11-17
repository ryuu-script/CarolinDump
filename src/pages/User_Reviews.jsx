/*
Purpose: Displays student comfort room reviews with a Sort dropdown menu, Back navigation, and empty state until reviews are added.
Dependencies:
         JSX: NULL
         CSS: stylesheets/user_reviews.css
         JS: NULL
*/

// imports
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../stylesheets/user_reviews.css";

const MAX_RATING = 5;

// Dropdown options for sorting reviews; default is "newest" (Date: Newest first)
const SORT_OPTIONS = [
    { value: "newest", label: "Date: Newest first" },
    { value: "oldest", label: "Date: Oldest first" },
    { value: "rating-high", label: "Rating: High to Low" },
    { value: "rating-low", label: "Rating: Low to High" },
];

// Initial reviews array (empty for now so the page shows "No reviews yet").
// Add review objects here or pass them to addReview() later:
// {
//     id: 1,
//     reviewer_name: "Juan Dela Cruz",
//     rating: 5,                        // 1–5
//     created_at: "2026-11-17",         // ISO date or timestamp string
//     comment: "Spotless and stocked!",
// }
const INITIAL_REVIEWS = [];

/*
Purpose: Normalizes a raw review object so reviews added via INITIAL_REVIEWS, addReview(), or a form share a consistent shape.
Parameters:
       raw: object containing reviewer name, rating (1–5), date submitted, and comment
       fallbackId: numeric id used when raw.id is not provided
Return value:
       type: Object
       description: normalized review object
*/
function createReview(raw = {}, fallbackId = 1) {
    const rawRating = Number(raw.rating);
    const validRating = Number.isFinite(rawRating)
        ? Math.min(MAX_RATING, Math.max(1, Math.round(rawRating)))
        : 1;

    return {
        id: raw.id ?? fallbackId,
        reviewer_name:
            String(raw.reviewer_name ?? raw.reviewerName ?? raw.name ?? "Anonymous").trim() ||
            "Anonymous",
        user_email: String(raw.user_email ?? raw.email ?? "").trim(),
        rating: validRating,
        created_at:
            raw.created_at ?? raw.dateSubmitted ?? raw.date ?? new Date().toISOString(),
        comment: String(raw.comment ?? "").trim(),
        building: String(raw.building ?? "").trim().toUpperCase(),
        building_id: String(raw.building_id ?? raw.building ?? "").trim().toLowerCase(),
        building_name: String(raw.building_name ?? "").trim(),
        room_code: String(raw.room_code ?? "").trim(),
        unit: String(raw.unit ?? "").trim(),
    };
}

/*
Purpose: Converts a review date string into a numeric timestamp (milliseconds) for sorting and formatting.
Parameters:
       dateValue: ISO or date string from the review record
Return value:
       type: number
       description: epoch milliseconds, or 0 if the date cannot be parsed
*/
function parseReviewTimestamp(dateValue) {
    if (!dateValue) return 0;
    const normalized =
        typeof dateValue === "string" && !dateValue.includes("T")
            ? dateValue.replace(" ", "T")
            : dateValue;
    const time = new Date(normalized).getTime();
    return Number.isFinite(time) ? time : 0;
}

/*
Purpose: Formats a review submission timestamp into a readable date string (e.g. "Nov 17, 2026").
Parameters:
       dateValue: ISO or date string
Return value:
       type: string
       description: formatted date label
*/
function formatReviewDate(dateValue) {
    const timestamp = parseReviewTimestamp(dateValue);
    if (!timestamp) return "Unknown date";
    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(timestamp));
}

// Helper for sorting by date: places the newer review before the older review.
// If two reviews have the exact same timestamp, higher review IDs come first.
function compareNewestFirst(a, b) {
    const timeDiff = parseReviewTimestamp(b.created_at) - parseReviewTimestamp(a.created_at);
    if (timeDiff !== 0) return timeDiff;
    return (Number(b.id) || 0) - (Number(a.id) || 0);
}

/*
Purpose: Returns a new array of reviews sorted by the user's selected option.
Parameters:
       reviews: array of review objects
       sortBy: selected sort key ("newest", "oldest", "rating-high", or "rating-low")
Return value:
       type: Object[]
       description: sorted copy of the reviews array
*/
function sortReviews(reviews, sortBy) {
    // Clone the array before sorting so React state is never mutated in place
    return [...reviews].sort((a, b) => {
        if (sortBy === "oldest") {
            // Date: Oldest first — invert the newest-first comparison so earlier dates appear first
            return -compareNewestFirst(a, b);
        }

        if (sortBy === "rating-high") {
            // Rating: High to Low — sort by rating descending (5 down to 1)
            const ratingDiff = Number(b.rating) - Number(a.rating);
            // Tie-breaker: for equal ratings, show the newer review first
            return ratingDiff !== 0 ? ratingDiff : compareNewestFirst(a, b);
        }

        if (sortBy === "rating-low") {
            // Rating: Low to High — sort by rating ascending (1 up to 5)
            const ratingDiff = Number(a.rating) - Number(b.rating);
            // Tie-breaker: for equal ratings, show the newer review first
            return ratingDiff !== 0 ? ratingDiff : compareNewestFirst(a, b);
        }

        // Default ("newest") — Date: Newest first
        return compareNewestFirst(a, b);
    });
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
            className={`reviews-ruby${on ? "" : " is-off"}`}
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
Purpose: Renders the User Reviews page with a Back button, Sort dropdown menu, and empty state or review list.
Parameters:
       initialReviews: optional starting array of reviews (defaults to INITIAL_REVIEWS)
Return value:
       type: JSX.Element
       description: the User Reviews page
*/
function User_Reviews({ initialReviews = INITIAL_REVIEWS }) {
    const navigate = useNavigate();

    // Reviews state starts empty by default and can be populated via INITIAL_REVIEWS, props, or addReview()
    const [reviews, setReviews] = useState(() =>
        initialReviews.map((item, idx) => createReview(item, idx + 1))
    );

    // Default sort order is "newest" (Date: Newest first)
    const [sortBy, setSortBy] = useState("newest");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    /*
    Purpose: Appends a new review ({ reviewer_name, rating, created_at, comment }) to the page state.
    Parameters:
           newReview: review object to add
    Return value:
           type: void
           description: NULL
    */
    const addReview = useCallback((newReview) => {
        setReviews((prev) => [createReview(newReview, prev.length + 1), ...prev]);
    }, []);

    // Close the Sort dropdown when clicking outside of it or pressing Escape
    useEffect(() => {
        if (!dropdownOpen) return;

        const handlePointerDown = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("pointerdown", handlePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [dropdownOpen]);

    // Re-compute the sorted reviews whenever the reviews list or chosen sort option changes
    const sortedReviews = useMemo(
        () => sortReviews(reviews, sortBy),
        [reviews, sortBy]
    );

    const currentSortOption =
        SORT_OPTIONS.find((option) => option.value === sortBy) ?? SORT_OPTIONS[0];

    /*
    Purpose: Navigates back to the previous in-app page, or to /student (Campus Map Dashboard) as the main page fallback.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleBack = () => {
        if (window.history.state?.idx > 0) {
            navigate(-1);
        } else {
            navigate("/student");
        }
    };

    return (
        <main className="reviews-page" data-ready={Boolean(addReview)}>
            <header className="reviews-header">
                <div className="reviews-heading">
                    <h1 className="reviews-title">User Reviews</h1>
                    <p className="reviews-subtitle">
                        See how fellow Carolinians rated comfort rooms across campus.
                    </p>
                </div>

                <Link className="reviews-submit-link" to="/reviews/submit">
                    + Submit a Review
                </Link>
            </header>

            <div className="reviews-toolbar">
                <div className="reviews-toolbar-start">
                    <button
                        type="button"
                        className="reviews-back-btn"
                        onClick={handleBack}
                        aria-label="Back to main page"
                    >
                        <svg
                            className="reviews-back-icon"
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

                    <p className="reviews-count" aria-live="polite">
                        {`${sortedReviews.length} ${
                            sortedReviews.length === 1 ? "review" : "reviews"
                        }`}
                    </p>
                </div>

                <div className="reviews-sort-dropdown" ref={dropdownRef}>
                    <button
                        type="button"
                        className="reviews-sort-btn"
                        aria-haspopup="listbox"
                        aria-expanded={dropdownOpen}
                        onClick={() => setDropdownOpen((open) => !open)}
                    >
                        <span className="reviews-sort-label">
                            Sort: {currentSortOption.label}
                        </span>
                        <span
                            className={`reviews-sort-caret${dropdownOpen ? " is-open" : ""}`}
                            aria-hidden="true"
                        >
                            ▾
                        </span>
                    </button>

                    {dropdownOpen && (
                        <ul
                            className="reviews-sort-menu"
                            role="listbox"
                            aria-label="Sort reviews"
                        >
                            {SORT_OPTIONS.map((option) => {
                                const isSelected = option.value === sortBy;
                                return (
                                    <li key={option.value} role="presentation">
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`reviews-sort-option${
                                                isSelected ? " is-selected" : ""
                                            }`}
                                            onClick={() => {
                                                setSortBy(option.value);
                                                setDropdownOpen(false);
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {sortedReviews.length === 0 ? (
                <div className="reviews-message" role="status" aria-live="polite">
                    <p>No reviews yet</p>
                </div>
            ) : (
                <section className="reviews-list" aria-label="Submitted comfort room reviews">
                    {sortedReviews.map((review, index) => (
                        <article
                            key={review.id ?? `${review.reviewer_name}-${review.created_at}-${index}`}
                            className="review-card"
                            style={{ "--i": index }}
                        >
                            <div className="review-card-top">
                                <div className="review-reviewer">
                                    <div className="review-avatar" aria-hidden="true">
                                        {review.reviewer_name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="review-reviewer-info">
                                        <h2 className="review-reviewer-name">
                                            {review.reviewer_name}
                                        </h2>
                                        {review.user_email && (
                                            <p className="review-reviewer-email">
                                                {review.user_email}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="review-meta-right">
                                    <div
                                        className="review-rating"
                                        role="img"
                                        aria-label={`Rated ${review.rating} out of ${MAX_RATING} Rubies`}
                                    >
                                        <span className="review-rubies" aria-hidden="true">
                                            {Array.from({ length: MAX_RATING }, (_, i) => (
                                                <RubyGem key={i} on={i < review.rating} />
                                            ))}
                                        </span>
                                        <span className="review-rating-num" aria-hidden="true">
                                            {review.rating}/{MAX_RATING}
                                        </span>
                                    </div>

                                    <time
                                        className="review-date"
                                        dateTime={review.created_at || undefined}
                                    >
                                        {formatReviewDate(review.created_at)}
                                    </time>
                                </div>
                            </div>

                            {(review.room_code || review.unit || review.building) && (
                                <div className="review-location-row">
                                    {review.building_id ? (
                                        <Link
                                            className="review-location-badge"
                                            to={`/building/${review.building_id}`}
                                        >
                                            {review.building} · {review.room_code}
                                            {review.unit ? ` — ${review.unit}` : ""}
                                        </Link>
                                    ) : (
                                        <span className="review-location-badge">
                                            {review.room_code}
                                            {review.unit ? ` — ${review.unit}` : ""}
                                        </span>
                                    )}
                                    {review.building_name && (
                                        <span className="review-building-name">
                                            {review.building_name}
                                        </span>
                                    )}
                                </div>
                            )}

                            <p
                                className={`review-comment${
                                    review.comment ? "" : " is-empty"
                                }`}
                            >
                                {review.comment || "No written comment provided."}
                            </p>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}

export default User_Reviews;
