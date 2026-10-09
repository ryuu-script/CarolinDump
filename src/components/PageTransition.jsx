import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../stylesheets/pagetransition.css";

// Total time for one page change: the old page fades out for half of it,
// then the new page fades in for the other half. Keep in sync with pagetransition.css.
const TRANSITION_MS = 500;
const HALF = TRANSITION_MS / 2;

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const keyOf = (loc) => loc.pathname + loc.search;

// Wraps the routes. When the URL changes it keeps showing the old page while it
// fades out, swaps to the new page, then fades that in. Covers every redirect:
// links, buttons, navigate(), and the browser's back / forward buttons.
// Usage: <PageTransition>{(location) => <Routes location={location}>...</Routes>}</PageTransition>
function PageTransition({ children }) {
    const location = useLocation();
    const [shown, setShown] = useState(location); // the page currently on screen
    const [phase, setPhase] = useState("in");     // "in" = fading in / visible, "out" = fading out

    useEffect(() => {
        if (keyOf(location) === keyOf(shown)) return;

        if (prefersReducedMotion()) {
            setShown(location);
            return;
        }

        setPhase("out");
        // If the URL changes again mid-fade, this restarts and lands on the latest page.
        const timer = setTimeout(() => {
            setShown(location);
            setPhase("in");
        }, HALF);
        return () => clearTimeout(timer);
    }, [location, shown]);

    return (
        <div className={`page-transition page-${phase}`}>
            {children(shown)}
        </div>
    );
}

export default PageTransition;