/*
Purpose: Gives every page change a smooth fade-out / fade-in, including back and forward browser navigation.
Dependencies:
         JSX: NULL
         CSS: stylesheets/global.css
         JS: NULL
*/

// imports
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import "../stylesheets/global.css";

// Total time for one page change: the old page fades out for half of it,
// then the new page fades in for the other half. Keep in sync with global.css.
const TRANSITION_MS = 500;
const HALF = TRANSITION_MS / 2;

/*
Purpose: Checks whether the user asked their device to reduce motion, so the fade can be skipped.
Parameters: NULL
Return value:
       type: boolean
       description: true if reduced motion is requested
*/
const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
Purpose: Builds a string that identifies a page (path plus query) so changes can be detected.
Parameters:
       loc: router location object
Return value:
       type: string
       description: the path followed by the query string
*/
const keyOf = (loc) => loc.pathname + loc.search;

/*
Purpose: Keeps the old page on screen while it fades out, then swaps in and fades in the new page whenever the URL changes.
Parameters:
       children: function that receives the location to show and returns the routes
Return value:
       type: JSX.Element
       description: the wrapper that holds the currently shown page
*/
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