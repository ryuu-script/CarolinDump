import { Routes, Route } from 'react-router-dom'

import PageTransition from './components/PageTransition.jsx'

import WelcomePage from './pages/WelcomePage.jsx'
import LoadingPage from './pages/LoadingPage.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CurrentBuilding from './pages/CurrentBuilding.jsx'
import AuthCallback from './pages/AuthCallback.jsx'

import "./stylesheets/app.css"

// Replace with real pages.
const PlaceholderPage = ({ title = "Placeholder page" }) => <h1>{title}</h1>

function App() {
    return (
        <PageTransition>
            {(location) => (
            <Routes location={location}>
                <Route path="/" element={<WelcomePage />} />
                <Route path="/loading" element={<LoadingPage />} />
                <Route path="/student" element={<Dashboard role="student" />} />
                <Route path="/admin" element={<Dashboard role="admin" />} />
                <Route path="/building/:buildingId" element={<CurrentBuilding />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/reviews" element={<PlaceholderPage title="User reviews" />} />
                <Route path="/reviews/submit" element={<PlaceholderPage title="Submit review" />} />
                <Route path="/sudo" element={<PlaceholderPage title="Sudo Mode" />} />
                <Route path="/placeholder" element={<PlaceholderPage />} />
            </Routes>
            )}
        </PageTransition>
    );
}

export default App