/*
Purpose: Shows the CarolinDump logo wherever branding is needed (start page, loading screen, sidebar).
Dependencies:
         JSX: NULL
         CSS: stylesheets/global.css
         JS: NULL
*/

// imports
import "../stylesheets/global.css";
import defaultLogo from "../assets/carolindump_logo.png";

/*
Purpose: Renders the CarolinDump logo image at an optional size.
Parameters:
       src: image to show (defaults to the CarolinDump logo)
       alt: alternative text for screen readers
       size: optional CSS size that overrides the default logo size
Return value:
       type: JSX.Element
       description: the logo image
*/
function Logo({ src = defaultLogo, alt = "CarolinDump", size }) {
    return (
        <img
            className="logo"
            src={src}
            alt={alt}
            style={size ? { "--logo-size": size } : undefined}
        />
    );
}

export default Logo;