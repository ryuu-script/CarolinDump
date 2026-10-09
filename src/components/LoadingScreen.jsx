import { useEffect, useState } from "react";
import Logo from "./Logo.jsx";
import "../stylesheets/loadingscreen.css";

const DEFAULT_MESSAGES = [
    "Christian is searching for toilet locations.",
    "Lance is mapping the bathrooms.",
    "Steph is testing the toilets and urinals.",
    "Leo is verifying user submissions.",
];

const DURATION = 3000;

// One dot per colour, filled in this order.
const DOT_COLORS = ["#f38ba8", "#a6e3a1", "#89b4fa", "#f9e2af", "#b4befe"];

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