/*
Purpose: Shows the 'Welcome to CarolinDump' title on the start page.
Dependencies:
         JSX: NULL
         CSS: stylesheets/page_start.css
         JS: NULL
*/

// imports
import "../stylesheets/page_start.css";

/*
Purpose: Renders the welcome title with the app name.
Parameters:
       name: app name to display
       tag: HTML tag used for the title (defaults to h1)
Return value:
       type: JSX.Element
       description: the title element
*/
function Header({ name = "CarolinDump", tag: Tag = "h1" }) {
    return (
        <Tag className="header-title">
            <span className="header-welcome">Welcome to</span>
            <span className="header-name">{name}</span>
        </Tag>
    );
}

export default Header;