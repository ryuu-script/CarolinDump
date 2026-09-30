import Logo from '../components/Logo.jsx'
import Header from '../components/Header.jsx'
import RoleSelect from '../components/RoleSelect.jsx'

function WelcomePage() {
    return (
        <main className="welcomePage">
            <Logo />
            <Header />
            <RoleSelect studentPath="/student" adminPath="/admin" />
        </main>
    );
}

export default WelcomePage