import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo.jsx";
import "../stylesheets/dashelements.css";

// What each role can use. `true` = enabled, `false` = shown but greyed out.
// `sudo` is different: when it is false the button is not rendered at all.
const ROLE_ACCESS = {
    student: { reviews: true, submit: true,  sudo: false },
    admin:   { reviews: true, submit: false, sudo: true },
};

// Replace these with real pages later.
const PATHS = {
    reviews: "/reviews",
    submit: "/reviews/submit",
    sudo: "/sudo",
};

// A link when it is enabled, a greyed-out button when it is not.
function MenuItem({ to, disabled, hint, onNavigate, children }) {
    if (disabled) {
        return (
            <button type="button" className="dash-button" disabled title={hint}>
                {children}
            </button>
        );
    }
    return (
        <Link className="dash-button" to={to} onClick={onNavigate}>
            {children}
        </Link>
    );
}

// Left sidebar on wide screens, hamburger menu on phones. Sits on top of the map.
function DashElements({ role = "student" }) {
    // An unknown role gets the most limited access.
    const access = ROLE_ACCESS[role] ?? ROLE_ACCESS.student;

    const [open, setOpen] = useState(false); // only matters on phones
    const close = () => setOpen(false);

    // Escape closes the menu.
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <>
            <button
                type="button"
                className="dash-toggle"
                aria-label={open ? "Close menu" : "Open menu"}
                aria-expanded={open}
                aria-controls="dash-sidebar"
                onClick={() => setOpen((o) => !o)}
            >
                <span className="dash-toggle-bar" />
                <span className="dash-toggle-bar" />
                <span className="dash-toggle-bar" />
            </button>

            <div className={`dash-backdrop${open ? " is-open" : ""}`} onClick={close} aria-hidden="true" />

            <aside id="dash-sidebar" className={`dash-sidebar${open ? " is-open" : ""}`}>
                <div className="dash-brand">
                    <Logo size={5} />
                    <p className="dash-title">CarolinDump</p>
                </div>

                <nav className="dash-menu" aria-label="Dashboard">
                    <MenuItem to={PATHS.reviews} disabled={!access.reviews} onNavigate={close}>
                        User reviews
                    </MenuItem>
                    <MenuItem
                        to={PATHS.submit}
                        disabled={!access.submit}
                        hint="Only students can submit reviews"
                        onNavigate={close}
                    >
                        Submit review
                    </MenuItem>
                </nav>

                {access.sudo && (
                    <div className="dash-bottom">
                        <MenuItem to={PATHS.sudo} onNavigate={close}>Sudo</MenuItem>
                    </div>
                )}
            </aside>
        </>
    );
}

export default DashElements;