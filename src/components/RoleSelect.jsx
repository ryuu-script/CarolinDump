import { Link } from "react-router-dom";
import "../stylesheets/roleselect.css";

// Each link goes to the loading screen first, and tells it where to go next.
const viaLoading = (path) => `/loading?to=${encodeURIComponent(path)}`;

function RoleSelect({ studentPath = "/student", adminPath = "/admin" }) {
    return (
        <nav className="role-select" aria-labelledby="role-title">
            <p id="role-title" className="role-title">What are you?</p>
            <div className="role-options">
                <Link className="role-button" to={viaLoading(studentPath)}>Student</Link>
                <Link className="role-button" to={viaLoading(adminPath)}>Admin</Link>
            </div>
        </nav>
    );
}

export default RoleSelect;