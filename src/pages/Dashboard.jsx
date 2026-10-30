/*
Purpose: Main page for students and admins: the campus map plus the role-based menu.
Dependencies:
         JSX: components/Campus_Map.jsx, components/Dash_Elements.jsx
         CSS: stylesheets/dashboard.css
         JS: NULL
*/

// imports
import CampusMap from "../components/Campus_Map.jsx";
import Dash_Elements from "../components/Dash_Elements.jsx";
import "../stylesheets/dashboard.css";

/*
Purpose: Shows the campus map and the role-based menu for the given role.
Parameters:
       role: "student" or "admin"
Return value:
       type: JSX.Element
       description: the dashboard page
*/
function Dashboard({ role = "student" }) {
    return (
        <main className={`dashboard dashboard-${role}`}>
            <h1 className="dashboard-heading">Campus map</h1>
            <CampusMap />
            <Dash_Elements role={role} />
        </main>
    );
}

export default Dashboard;