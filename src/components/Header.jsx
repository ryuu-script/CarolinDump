import "../stylesheets/header.css";

function Header({ name = "CarolinDump", tag: Tag = "h1" }) {
    return (
        <Tag className="header-title">
            <span className="header-welcome">Welcome to</span>
            <span className="header-name">{name}</span>
        </Tag>
    );
}

export default Header;