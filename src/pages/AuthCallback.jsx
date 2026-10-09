import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { completeSignIn } from "../auth/auth.js";
import "../stylesheets/authcallback.css";

const REDIRECT_SECONDS = 5;

const MESSAGES = {
    rejected: {
        title: "You must be a Carolinian to log-in...",
        text: "Only @usc.edu.ph accounts can sign in to CarolinDump.",
    },
    cancelled: {
        title: "Sign-in cancelled",
        text: "You closed the Google sign-in before it finished.",
    },
    error: {
        title: "We couldn't verify that sign-in",
        text: "Something went wrong while checking your Google account. Please try again.",
    },
};

// Where Google sends people after they pick an account (see auth.js).
// Good login: saved, and this tab heads back to the dashboard.
// Anything else: a message, a visible 5 second timer, then back to the dashboard.
function AuthCallback() {
    const navigate = useNavigate();
    const [result] = useState(completeSignIn);
    const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
    const ok = result.status === "ok";

    // Success: try to close this tab (works if the browser allows it), otherwise just go to the dashboard.
    useEffect(() => {
        if (!ok) return;
        window.close();
        const timer = setTimeout(() => navigate(result.to, { replace: true }), 800);
        return () => clearTimeout(timer);
    }, [ok, navigate, result.to]);

    // Failure: count down once a second, then redirect.
    useEffect(() => {
        if (ok) return;
        if (seconds <= 0) {
            navigate(result.to, { replace: true });
            return;
        }
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [ok, seconds, navigate, result.to]);

    if (ok) {
        return (
            <main className="auth-page">
                <h1 className="auth-title auth-title-ok">You're signed in</h1>
                <p className="auth-text">Taking you back to the dashboard…</p>
            </main>
        );
    }

    const { title, text } = MESSAGES[result.status] ?? MESSAGES.error;
    const circumference = 2 * Math.PI * 45;

    return (
        <main className="auth-page">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-text">{text}</p>

            <div className="auth-timer" aria-hidden="true">
                <svg viewBox="0 0 100 100" className="auth-timer-ring">
                    <circle className="auth-timer-track" cx="50" cy="50" r="45" />
                    <circle
                        className="auth-timer-progress"
                        cx="50"
                        cy="50"
                        r="45"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - seconds / REDIRECT_SECONDS)}
                    />
                </svg>
                <span className="auth-timer-number">{seconds}</span>
            </div>

            <p className="auth-text">
                Taking you back to the dashboard in {seconds} second{seconds === 1 ? "" : "s"}…
            </p>
            <Link className="auth-link" to={result.to} replace>Go back now</Link>
        </main>
    );
}

export default AuthCallback;