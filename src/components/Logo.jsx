import "../stylesheets/logo.css";
import defaultLogo from "../assets/carolindump_logo.png";

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