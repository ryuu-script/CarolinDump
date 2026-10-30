/*
Purpose: Admin login form that lets admins into the admin dashboard.
Dependencies:
         JSX: NULL
         CSS: stylesheets/login.css
         JS: authentication/admin_auth.js
*/

// imports
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { adminLogin, getAdmin } from "../authentication/admin_auth.js";
import "../stylesheets/login.css";

/*
Purpose: Shows the admin login form and redirects admins who are already signed in.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the login page
*/
function Login_Admin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    // After logging in, show the loading screen, which then continues to /admin.
    const afterLogin = `/loading?to=${encodeURIComponent("/admin")}`;

    if (getAdmin()) return <Navigate to={afterLogin} replace />;

    /*
    Purpose: Checks the admin's email and password, then continues to the loading screen or shows an error.
    Parameters:
           e: form submit event
    Return value:
           type: Promise<void>
           description: resolves when the login attempt is finished
    */
    async function onSubmit(e) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const result = await adminLogin(email, password);
        if (result.ok) {
            navigate(afterLogin, { replace: true });
        } else {
            setError(result.error);
            setPassword("");
            setBusy(false);
        }
    }

    return (
        <main className="admin-login">
            <form className="admin-form" onSubmit={onSubmit} noValidate>
                <h1 className="admin-title">Admin login</h1>

                <label className="admin-field">
                    <input
                        type="email"
                        placeholder="Email"
                        aria-label="Email"
                        name="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </label>

                <label className="admin-field">
                    <input
                        type="password"
                        placeholder="Password"
                        aria-label="Password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>

                <p className="admin-error" role="alert" aria-live="polite">{error}</p>

                <div className="admin-actions">
                    <Link className="admin-back" to="/">Back</Link>
                    <button className="admin-submit" type="submit" disabled={busy || !email || !password}>
                        {busy ? (
                            <span className="admin-dots" role="status" aria-label="Checking">
                                <span /><span /><span />
                            </span>
                        ) : "Log in"}
                    </button>
                </div>
            </form>
        </main>
    );
}

export default Login_Admin;