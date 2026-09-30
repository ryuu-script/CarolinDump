import { Routes, Route } from 'react-router-dom'

import WelcomePage from './pages/WelcomePage.jsx'
import LoadingPage from './pages/LoadingPage.jsx'

import "./stylesheets/app.css"

// Replace with real pages.
const StudentPage = () => <h1>Student page</h1>
const AdminPage = () => <h1>Admin page</h1>

function App() {
    return (
        <Routes>
            <Route path="/" element={<WelcomePage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/student" element={<StudentPage />} />
            <Route path="/admin" element={<AdminPage />} />
        </Routes>
    );
}

export default App