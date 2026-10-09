import { useState } from "react";
import "../stylesheets/bathroomcard.css";

const MAX_RATING = 5;

// A single ruby gem. Filled (#f38ba8) when earned, muted when not.
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

// One bathroom: photos (0 to 3), room code, unit and a 1-5 ruby rating.
function BathroomCard({ img = [], room_code, unit, rating, index = 0 }) {
    const [active, setActive] = useState(0);
    const photos = img.slice(0, 3);
    const stars = Math.min(MAX_RATING, Math.max(1, Math.round(rating)));

    return (
        <article className="bathroom-card" style={{ "--i": index }}>
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
                            onClick={() => setActive(i)}
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