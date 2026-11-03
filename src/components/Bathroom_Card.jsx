/*
Purpose: Displays one bathroom (photos, room code, unit and ruby rating) in the building page grid and opens Submit Review when clicked.
Dependencies:
         JSX: NULL
         CSS: stylesheets/building.css
         JS: NULL
*/

// imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../stylesheets/building.css";

const MAX_RATING = 5;

/*
Purpose: Draws a single ruby gem used as one point of the rating, filled when earned and muted when not.
Parameters:
       on: true if this ruby is earned
Return value:
       type: JSX.Element
       description: the ruby icon
*/
function Ruby({ on }) {
    return (
        <svg
            className={`bathroom-ruby${on ? "" : " is-off"}`}
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
Purpose: Builds the Submit Review URL with query parameters for a selected building and comfort room unit.
Parameters:
       buildingId: building route id such as "lb"
       id: database id of the bathroom unit, if available
       room_code: room code such as "LB107"
       unit: comfort room unit label such as "Left Stall"
Return value:
       type: string
       description: relative URL to /reviews/submit with prefill query parameters
*/
function buildSubmitUrl(buildingId, id, room_code, unit) {
    const params = new URLSearchParams();
    params.set("building", String(buildingId).toLowerCase());
    if (Number.isInteger(id) && id > 0) params.set("bathroom", String(id));
    if (room_code) params.set("room", room_code);
    if (unit) params.set("unit", unit);
    params.set("locked", "1");
    return `/reviews/submit?${params.toString()}`;
}

/*
Purpose: Shows one bathroom with its photo gallery, room code, unit and 1-5 ruby rating, navigating to Submit Review when clicked.
Parameters:
       id: database id of the bathroom row, if available
       buildingId: building route id such as "lb"
       building: building metadata object ({ code, name }), if available
       onSelect: optional callback invoked when the card is activated
       img: list of photo URLs (only the first 3 are used)
       room_code: room code such as LB446
       unit: unit or gender label of the bathroom
       rating: rating of the bathroom, rounded and kept between 1 and 5
       index: position in the grid, used to stagger the entry animation
Return value:
       type: JSX.Element
       description: the interactive bathroom card
*/
function BathroomCard({
    id = null,
    buildingId = "",
    building = null,
    onSelect,
    img = [],
    room_code,
    unit,
    rating,
    index = 0,
}) {
    const navigate = useNavigate();
    const [active, setActive] = useState(0);
    const photos = img.slice(0, 3);
    const stars = Math.min(MAX_RATING, Math.max(1, Math.round(rating)));
    const interactive = Boolean(onSelect || buildingId);

    /*
    Purpose: Navigates to Submit Review with this card's building and unit prefilled, or runs onSelect when provided.
    Parameters: NULL
    Return value:
           type: void
           description: NULL
    */
    const handleActivate = () => {
        if (!interactive) return;
        if (onSelect) {
            onSelect({ id, buildingId, building, room_code, unit, rating });
            return;
        }
        const normalizedBuildingId = String(buildingId).toLowerCase();
        navigate(buildSubmitUrl(normalizedBuildingId, id, room_code, unit), {
            state: {
                prefill: {
                    buildingId: normalizedBuildingId,
                    buildingCode: building?.code ?? normalizedBuildingId.toUpperCase(),
                    buildingName: building?.name ?? "",
                    bathroomId: id,
                    room_code,
                    unit,
                    locked: true,
                },
            },
        });
    };

    /*
    Purpose: Activates the card when Enter or Space is pressed while focus is on the card itself.
    Parameters:
           e: keyboard event
    Return value:
           type: void
           description: NULL
    */
    const handleKeyDown = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleActivate();
        }
    };

    return (
        <article
            className={`bathroom-card${interactive ? " is-clickable" : ""}`}
            style={{ "--i": index }}
            role={interactive ? "link" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
                interactive
                    ? `${room_code} ${unit}, rated ${stars} out of ${MAX_RATING}. Select to submit a review.`
                    : undefined
            }
            onClick={interactive ? handleActivate : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
        >
            <div className="bathroom-photo">
                {photos.length > 0 ? (
                    <img
                        className="bathroom-photo-img"
                        src={photos[active] ?? photos[0]}
                        alt={`${room_code} photo ${active + 1} of ${photos.length}`}
                        loading="lazy"
                    />
                ) : (
                    <span className="bathroom-photo-empty">No photos</span>
                )}
            </div>

            {photos.length > 1 && (
                <div className="bathroom-thumbs" role="group" aria-label={`${room_code} photos`}>
                    {photos.map((src, i) => (
                        <button
                            key={src + i}
                            type="button"
                            className={`bathroom-thumb${i === active ? " is-active" : ""}`}
                            aria-label={`Show photo ${i + 1}`}
                            aria-pressed={i === active}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActive(i);
                            }}
                        >
                            <img src={src} alt="" loading="lazy" />
                        </button>
                    ))}
                </div>
            )}

            <div className="bathroom-info">
                <h2 className="bathroom-room">{room_code}</h2>
                <p className="bathroom-unit">{unit}</p>
                <p className="bathroom-rating" role="img" aria-label={`Rating ${stars} out of ${MAX_RATING}`}>
                    <span className="bathroom-stars" aria-hidden="true">
                        {Array.from({ length: MAX_RATING }, (_, i) => (
                            <Ruby key={i} on={i < stars} />
                        ))}
                    </span>
                    <span className="bathroom-rating-num" aria-hidden="true">{stars}/{MAX_RATING}</span>
                </p>
            </div>
        </article>
    );
}

export default BathroomCard;
