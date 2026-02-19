import { Link, useLocation } from "react-router-dom";
import { Sparkles, FileText, MessageSquare, BarChart3, Briefcase } from "lucide-react";

export default function Navbar() {
    const location = useLocation();

    const links = [
        { to: "/", label: "หน้าแรก", icon: Sparkles },
        { to: "/resume", label: "วิเคราะห์ Resume", icon: FileText },
        { to: "/interview", label: "ฝึกสัมภาษณ์", icon: MessageSquare },
        { to: "/dashboard", label: "สรุปผล", icon: BarChart3 },
    ];

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <Link to="/" className="nav-logo">
                    <span className="logo-icon">
                        <Briefcase size={20} color="white" />
                    </span>
                    <span>
                        Job<span className="gradient-text">Ready</span>
                    </span>
                </Link>
                <div className="nav-links">
                    {links.map((link) => (
                        <Link
                            key={link.to}
                            to={link.to}
                            className={`nav-link ${location.pathname === link.to ? "active" : ""}`}
                        >
                            <link.icon size={16} />
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    );
}
