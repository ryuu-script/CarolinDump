/*
Purpose: Shows the branded loading screen with a random message and progress dots, then tells the caller when it is done.
Dependencies:
         JSX: components/Logo.jsx
         CSS: stylesheets/page_loading.css
         JS: NULL
*/

// imports
import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import "../stylesheets/page_loading.css";

const DEFAULT_MESSAGES = [
    "Christian is searching for toilet locations.",
    "Lance is mapping the bathrooms.",
    "Steph is testing the toilets and urinals.",
    "Leo is verifying user submissions.",
];

const DURATION = 3000;

// One dot per colour, filled in this order.
const DOT_COLORS = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#b4befe"];

/*
Purpose: Shows the logo, a random loading message and animated dots, and calls onComplete once the loading time is over.
Parameters:
       messages: list of messages to pick one from
       onComplete: called after the loading duration; if missing, nothing happens
Return value:
       type: JSX.Element
       description: the loading screen
*/
function LoadingScreen({ messages = DEFAULT_MESSAGES, onComplete }) {
    const [message] = useState(
        () => messages[Math.floor(Math.random() * messages.length)]
    );

    useEffect(() => {
        if (!onComplete) return;
        const timer = setTimeout(onComplete, DURATION);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="loading-screen">
            <Logo />
            <div className="loading-info">
                <p className="loading-message" aria-live="polite">{message}</p>
                <div className="loading-dots" role="progressbar" aria-label="Loading" style={{ "--duration": `${DURATION}ms` }}>
                    {DOT_COLORS.map((color, i) => (
                        <span key={color} className="loading-dot" style={{ "--c": color, "--i": i }} />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default LoadingScreen;