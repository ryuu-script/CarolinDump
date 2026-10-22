import { Navigate } from "react-router-dom";
import { getAdmin } from "../auth/admin_auth.js";

// Sends anyone who hasn't signed in as an admin to the admin login page.
function RequireAdmin({ children }) {
    return getAdmin() ? children : <Navigate to="/admin/login" replace />;
}

export default RequireAdmin;