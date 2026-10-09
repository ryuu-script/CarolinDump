import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "./Logo.jsx";
import "../stylesheets/dashelements.css";

// What each role can use. `true` = enabled, `false` = shown but greyed out.
// `sudo` is different: when it is false the button is not rendered at all.
const ROLE_ACCESS = {
    student: { home: "/student", reviews: true, submit: true,  sudo: false },
    admin:   { home: "/admin",   reviews: true, submit: false, sudo: true },
};

// Replace these with real pages later.
const PATHS = {
    reviews: "/reviews",
    submit: "/reviews/submit",
    sudo: "/sudo",
};

// Outline icons (drawn in the current text colour, so they follow the item's state).
function Icon({ children }) {
    return (
        <svg
            className="dash-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {children}
        </svg>
    );
}

const ICONS = {
    dashboard: (
        <Icon>
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <path d="M17.5 14v7M14 17.5h7" />
        </Icon>
    ),
    reviews: (
        <Icon>
            <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </Icon>
    ),
    submit: (
        <Icon>
            <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
            <path d="M13.5 6.5l4 4" />
        </Icon>
    ),
    back: (
        <Icon>
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
        </Icon>
    ),
    sudo: (
        <Icon>
            <path d="M4 6l6 6-6 6" />
            <path d="M12 19h8" />
        </Icon>
    ),
};

// A link when it is enabled, a greyed-out button when it is not.
// The link for the page you are on gets the filled "active" pill.
function MenuItem({ to, icon, hue, disabled, hint, onNavigate, children }) {
    const style = { "--hue": `var(--${hue})` };
    const content = (
        <>
            {icon}
            <span className="dash-label">{children}</span>
        </>
    );
    if (disabled) {
        return (
            <button type="button" className="dash-button" style={style} disabled title={hint}>
                {content}
            </button>
        );
    }
    return (
        <NavLink className="dash-button" style={style} to={to} end onClick={onNavigate}>
            {content}
        </NavLink>
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
                    <MenuItem to={access.home} icon={ICONS.dashboard} hue="lavender" onNavigate={close}>
                        Dashboard
                    </MenuItem>
                    <MenuItem to={PATHS.reviews} icon={ICONS.reviews} hue="green" disabled={!access.reviews} onNavigate={close}>
                        User Reviews
                    </MenuItem>
                    <MenuItem
                        to={PATHS.submit}
                        icon={ICONS.submit}
                        hue="yellow"
                        disabled={!access.submit}
                        hint="Only students can submit reviews"
                        onNavigate={close}
                    >
                        Submit Review
                    </MenuItem>
                    <Link className="dash-button dash-back" style={{ "--hue": "var(--red)" }} to="/" onClick={close} aria-label="Back">
                        {ICONS.back}
                        <span className="dash-label">Back</span>
                    </Link>
                </nav>

                {access.sudo && (
                    <div className="dash-bottom">
                        <MenuItem to={PATHS.sudo} icon={ICONS.sudo} hue="red" onNavigate={close}>Sudo</MenuItem>
                    </div>
                )}
            </aside>
        </>
    );
}

export default DashElements;