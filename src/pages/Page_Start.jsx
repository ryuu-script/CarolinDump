/*
Purpose: Welcome page of the app, where visitors pick their role.
Dependencies:
         JSX: components/Logo.jsx, components/Header.jsx, components/Role_Select.jsx
         CSS: stylesheets/page_start.css
         JS: NULL
*/

// imports
import Logo from '../components/Logo.jsx'
import Header from '../components/Header.jsx'
import RoleSelect from '../components/Role_Select.jsx'
import '../stylesheets/page_start.css'

/*
Purpose: Builds the welcome page with the logo, title and role choice.
Parameters: NULL
Return value:
       type: JSX.Element
       description: the welcome page
*/
function Page_Start() {
    return (
        <main className="welcomePage">
            <Logo />
            <Header />
            <RoleSelect studentPath="/student" adminPath="/admin/login" />
        </main>
    );
}

export default Page_Start