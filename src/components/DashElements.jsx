import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { startSignIn, signOut, useUser, ALLOWED_DOMAIN } from "../auth/auth.js";
import Logo from "./Logo.jsx";
import guestPfp from "../assets/pfp_guest.png";
import "../stylesheets/dashelements.css";

// What each role can use. `true` = enabled, `false` = shown but greyed out.
// `sudo` is different: when it is false the button is not rendered at all.
// `requiresLogin`: guests who press Submit Review are asked to sign in first. Admins skip that.
const ROLE_ACCESS = {
    student: { home: "/student", reviews: true, submit: true, requiresLogin: true,  sudo: false },
    admin:   { home: "/admin",   reviews: true, submit: true, requiresLogin: false, sudo: true },
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
            <path d="M6 3h12l4 6-10 13L2 9z" />
            <path d="M11 3L8 9l4 13 4-13-3-6" />
            <path d="M2 9h20" />
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
    signout: (
        <Icon>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5" />
            <path d="M21 12H9" />
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
// With `onPress` it is a plain button instead (used to ask guests to sign in).
// The link for the page you are on gets the filled "active" pill.
function MenuItem({ to, icon, hue, disabled, hint, onNavigate, onPress, children }) {
    const style = { "--hue": `var(--${hue})` };
    const content = (
        <>
            {icon}
            <span className="dash-label">{children}</span>
        </>
    );
    if (disabled || onPress) {
        return (
            <button type="button" className="dash-button" style={style} disabled={disabled} title={hint} onClick={onPress}>
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

// Guest picture, also used when a Google photo fails to load.
function EmptyAvatar() {
    return <img className="dash-avatar" src={guestPfp} alt="" aria-hidden="true" />;
}

function Avatar({ src }) {
    const [broken, setBroken] = useState(false);
    if (!src || broken) return <EmptyAvatar />;
    return (
        <img
            className="dash-avatar"
            src={src}
            alt=""
            referrerPolicy="no-referrer" // Google's photo host can refuse requests that carry a referrer
            onError={() => setBroken(true)}
        />
    );
}

// Floating pill, top right. Guest -> click to sign in. Signed in -> click for Sign out.
// Admins see "Admin" instead of an email, signed in or not.
function AccountPill({ user, isAdmin, onSignIn }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const wrapRef = useRef(null);

    // Close the sign-out menu on Escape or a click outside it. It also closes if the person signs out.
    useEffect(() => {
        if (!menuOpen) return;
        const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
        const onPointer = (e) => !wrapRef.current?.contains(e.target) && setMenuOpen(false);
        window.addEventListener("keydown", onKey);
        document.addEventListener("pointerdown", onPointer);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.removeEventListener("pointerdown", onPointer);
        };
    }, [menuOpen]);

    const label = isAdmin ? "Admin" : user ? user.email : "Guest";
    const hint = user ? "Account menu" : "Sign in with your USC Google account";

    return (
        <div className="dash-account" ref={wrapRef}>
            <button
                type="button"
                className={`dash-pill${isAdmin ? " is-admin" : ""}${user ? " is-signed-in" : ""}`}
                title={hint}
                aria-haspopup={user ? "menu" : undefined}
                aria-expanded={user ? menuOpen : undefined}
                onClick={user ? () => setMenuOpen((o) => !o) : onSignIn}
            >
                <Avatar key={user?.picture ?? "none"} src={user?.picture} />
                <span className="dash-pill-label">{label}</span>
                <span className="dash-sr-only">{user ? "Signed in. Open account menu." : "Not signed in. Sign in with Google."}</span>
            </button>

            {user && menuOpen && (
                <div className="dash-popover" role="menu">
                    <button
                        type="button"
                        role="menuitem"
                        className="dash-button"
                        style={{ "--hue": "var(--red)" }}
                        autoFocus
                        onClick={() => { setMenuOpen(false); signOut(); }}
                    >
                        {ICONS.signout}
                        <span className="dash-label">Sign out</span>
                    </button>
                </div>
            )}
        </div>
    );
}

// Shown when a guest presses Submit Review.
function SignInPrompt({ onSignIn, onClose, error }) {
    const primaryRef = useRef(null);

    useEffect(() => {
        const previous = document.activeElement;
        primaryRef.current?.focus();
        const onKey = (e) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            previous?.focus?.(); // put focus back on Submit Review
        };
    }, [onClose]);

    return (
        <div className="dash-modal-backdrop" onClick={onClose}>
            <div
                className="dash-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="dash-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="dash-modal-title" className="dash-modal-title">Sign in to submit a review</h2>
                <p className="dash-modal-text">
                    Reviews are for Carolinians. Sign in with your @{ALLOWED_DOMAIN} Google account to continue.
                    Google opens in a new tab.
                </p>
                {error && <p className="dash-modal-error" role="alert">{error}</p>}
                <div className="dash-modal-actions">
                    <button type="button" ref={primaryRef} className="dash-modal-button is-primary" onClick={onSignIn}>
                        Sign in with Google
                    </button>
                    <button type="button" className="dash-modal-button" onClick={onClose}>
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}

const MISSING_CLIENT_ID = "Google sign-in isn't set up yet. Add VITE_GOOGLE_CLIENT_ID to your .env file.";

// Left sidebar on wide screens, hamburger menu on phones. Sits on top of the map.
function DashElements({ role = "student" }) {
    // An unknown role gets the most limited access.
    const access = ROLE_ACCESS[role] ?? ROLE_ACCESS.student;
    const isAdmin = role === "admin" && access === ROLE_ACCESS.admin;

    const user = useUser(); // null = guest

    const [open, setOpen] = useState(false); // only matters on phones
    const close = () => setOpen(false);

    const [promptOpen, setPromptOpen] = useState(false); // "sign in first" dialog
    const [authError, setAuthError] = useState("");

    // Opens Google in a new tab. The dashboard updates by itself once that tab finishes.
    const signIn = () => {
        const { ok } = startSignIn(access.home);
        setAuthError(ok ? "" : MISSING_CLIENT_ID);
    };

    // The login finished in the other tab: the dialog has done its job.
    useEffect(() => {
        if (user) setPromptOpen(false);
    }, [user]);

    // Stable, so the dialog's keyboard / focus effect does not re-run on every render.
    const closePrompt = useCallback(() => {
        setPromptOpen(false);
        setAuthError("");
    }, []);

    // Guests (who are not admins) are asked to sign in before they can submit.
    const guestMustSignIn = access.requiresLogin && !user;

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
                        hint="Not available for your role"
                        onNavigate={close}
                        onPress={guestMustSignIn ? () => { close(); setAuthError(""); setPromptOpen(true); } : undefined}
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

            <AccountPill user={user} isAdmin={isAdmin} onSignIn={signIn} />
            {authError && !promptOpen && <p className="dash-notice" role="alert">{authError}</p>}

            {promptOpen && <SignInPrompt onSignIn={signIn} onClose={closePrompt} error={authError} />}
        </>
    );
}

export default DashElements;