/*
Purpose: Protects admin-only pages by sending anyone who is not signed in as an admin to the admin login.
Dependencies:
         JSX: NULL
         CSS: NULL
         JS: authentication/admin_auth.js
*/

// imports
import { Navigate } from "react-router-dom";
import { getAdmin } from "../authentication/admin_auth.js";

/*
Purpose: Shows the protected page only to signed-in admins and redirects everyone else to the admin login.
Parameters:
       children: the admin-only content to protect
Return value:
       type: JSX.Element | ReactNode
       description: the children for admins, or a redirect to /admin/login
*/
function RequireAdmin({ children }) {
    return getAdmin() ? children : <Navigate to="/admin/login" replace />;
}

export default RequireAdmin;