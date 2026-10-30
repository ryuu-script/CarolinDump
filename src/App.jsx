/*
Purpose: Defines every route of the app and which page each URL shows, wrapped in the fade page transition.
Dependencies:
         JSX: components/Page_Transition.jsx, components/Require_Admin.jsx, pages/Page_Start.jsx, pages/Page_Loading.jsx, pages/Dashboard.jsx, pages/Building_Current.jsx, pages/Login_Admin.jsx, pages/Login_Google.jsx
         CSS: NULL
         JS: NULL
*/

// imports
import { Routes, Route } from 'react-router-dom'

import PageTransition from './components/Page_Transition.jsx'

import Page_Start from './pages/Page_Start.jsx'
import Page_Loading from './pages/Page_Loading.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Building_Current from './pages/Building_Current.jsx'
import Login_Admin from './pages/Login_Admin.jsx'
import RequireAdmin from './components/Require_Admin.jsx'
import Login_Google from './pages/Login_Google.jsx'

/*
Purpose: Temporary page shown for routes that are not built yet.
Parameters:
       title: text of the placeholder heading
Return value:
       type: JSX.Element
       description: an h1 with the given title
*/
const PlaceholderPage = ({ title = "Placeholder page" }) => <h1>{title}</h1>

/*
Purpose: Declares all routes of the app and renders the page that matches the current URL.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the routes wrapped in the page transition
*/
function App() {
    return (
        <PageTransition>
            {(location) => (
            <Routes location={location}>
                <Route path="/" element={<Page_Start />} />
                <Route path="/loading" element={<Page_Loading />} />
                <Route path="/student" element={<Dashboard role="student" />} />
                <Route path="/admin/login" element={<Login_Admin />} />
                <Route path="/admin" element={<RequireAdmin><Dashboard role="admin" /></RequireAdmin>} />
                <Route path="/building/:buildingId" element={<Building_Current />} />
                <Route path="/auth/callback" element={<Login_Google />} />
                <Route path="/reviews" element={<PlaceholderPage title="User reviews" />} />
                <Route path="/reviews/submit" element={<PlaceholderPage title="Submit review" />} />
                <Route path="/sudo" element={<RequireAdmin><PlaceholderPage title="Sudo Mode" /></RequireAdmin>} />
                <Route path="/placeholder" element={<PlaceholderPage />} />
            </Routes>
            )}
        </PageTransition>
    );
}

export default App