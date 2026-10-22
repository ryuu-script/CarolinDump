import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { adminLogin, getAdmin } from "../auth/admin_auth.js";
import "../stylesheets/adminlogin.css";

function AdminLogin() {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (getAdmin()) return <Navigate to="/admin" replace />;

    async function onSubmit(e) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        const result = await adminLogin(email, password);
        if (result.ok) {
            navigate("/admin", { replace: true });
        } else {
            setError(result.error);
            setPassword("");
            setBusy(false);
        }
    }

    return (
        <main className="admin-login">
            <Logo />
            <form className="admin-form" onSubmit={onSubmit} noValidate>
                <h1 className="admin-title">Admin login</h1>

                <label className="admin-field">
                    <span>Email</span>
                    <input
                        type="email"
                        name="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                </label>

                <label className="admin-field">
                    <span>Password</span>
                    <input
                        type="password"
                        name="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </label>

                <p className="admin-error" role="alert" aria-live="polite">{error}</p>

                <button className="admin-submit" type="submit" disabled={busy || !email || !password}>
                    {busy ? "Checking…" : "Log in"}
                </button>
                <Link className="admin-back" to="/">Back</Link>
            </form>
        </main>
    );
}

export default AdminLogin;