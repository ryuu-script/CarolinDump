import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import "../stylesheets/loadingscreen.css";

const DEFAULT_MESSAGES = [
    "Rendering toilet locations...",
    "Reporting clogged toilets...",
    "Counting available stalls...",
    "Checking for toilet paper...",
    "Rubi is still pooping, please wait...",
];

const DURATION = 2000;

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
                <div className="loading-bar" role="progressbar" aria-label="Loading">
                    <div
                        className="loading-fill"
                        style={{ "--duration": `${DURATION}ms` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default LoadingScreen;