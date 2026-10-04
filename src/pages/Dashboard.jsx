import CampusMap from "../components/CampusMap.jsx";
import DashElements from "../components/DashElements.jsx";
import "../stylesheets/dashboard.css";

// One dashboard for every role. The route decides the role (see App.jsx),
// and DashElements turns buttons on or off to match.
function Dashboard({ role = "student" }) {
    return (
        <main className={`dashboard dashboard-${role}`}>
            <h1 className="dashboard-heading">Campus map</h1>
            <CampusMap />
            <DashElements role={role} />
        </main>
    );
}

export default Dashboard;