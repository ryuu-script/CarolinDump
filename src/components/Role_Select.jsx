/*
Purpose: Lets visitors choose whether they enter the app as a Student or an Admin.
Dependencies:
         JSX: NULL
         CSS: stylesheets/page_start.css
         JS: NULL
*/

// imports
import { Link } from "react-router-dom";
import "../stylesheets/page_start.css";

/*
Purpose: Builds a link to the loading screen that continues to the given page afterwards.
Parameters:
       path: page to open once loading finishes
Return value:
       type: string
       description: the /loading URL with the destination encoded in it
*/
const viaLoading = (path) => `/loading?to=${encodeURIComponent(path)}`;

/*
Purpose: Shows the 'What are you?' choice with Student and Admin links.
Parameters:
       studentPath: where the Student button goes
       adminPath: where the Admin button goes
Return value:
       type: JSX.Element
       description: the role selection menu
*/
function RoleSelect({ studentPath = "/student", adminPath = "/admin" }) {
    return (
        <nav className="role-select" aria-labelledby="role-title">
            <p id="role-title" className="role-title">What are you?</p>
            <div className="role-options">
                <Link className="role-button" to={viaLoading(studentPath)}>Student</Link>
                <Link className="role-button" to={adminPath}>Admin</Link>
            </div>
        </nav>
    );
}

export default RoleSelect;