import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
    Home, Briefcase, Upload, Search, BarChart3,
    Users, User, LogOut, Menu, X, Shield
} from "lucide-react";
import { useState } from "react";

export default function Layout() {
    const { user, logout, isDetective, isAdmin, isCaseOfficer, isProsecutor } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setMobileMenuOpen(false);
    };

    const navigationLinks = [
        { to: "/dashboard", icon: Home, label: "Dashboard" }
    ];

    if (isDetective || isCaseOfficer || isProsecutor) {
        navigationLinks.push({ to: "/cases", icon: Briefcase, label: "Cases" });
    }

    if (isDetective || isCaseOfficer) {
        navigationLinks.push({ to: "/upload", icon: Upload, label: "Upload Evidence" });
    }

    if (isDetective || isCaseOfficer || isProsecutor) {
        navigationLinks.push({ to: "/search", icon: Search, label: "Search" });
    }

    if (isDetective || isProsecutor) {
        navigationLinks.push({ to: "/analytics", icon: BarChart3, label: "Analytics" });
    }

    if (isAdmin) {
        navigationLinks.push({ to: "/users", icon: Users, label: "Users" });
    }

    return (
        <div className="layout">
            {/* Header */}
            <header className="header">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            className="mobile-menu-toggle"
                            onClick={toggleMobileMenu}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="logo">
                            <Shield size={28} />
                            <span className="logo-text">Digital Evidence System</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="user-info">
                            <div className="user-avatar">
                                {user.fullName.charAt(0)}
                            </div>
                            <div className="user-details">
                                <span className="user-name">{user.fullName}</span>
                                <span className="user-role">{user.role.replace('_', ' ')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="layout-main">
                {/* Sidebar */}
                <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
                    <nav className="sidebar-nav">
                        {navigationLinks.map(link => (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                className={({ isActive }) =>
                                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                                }
                                onClick={closeMobileMenu}
                            >
                                <link.icon size={20} />
                                <span>{link.label}</span>
                            </NavLink>
                        ))}

                        <div className="nav-divider"></div>

                        <NavLink
                            to="/profile"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'nav-link-active' : ''}`
                            }
                            onClick={closeMobileMenu}
                        >
                            <User size={20} />
                            <span>Profile</span>
                        </NavLink>

                        <button className="nav-link logout-link" onClick={handleLogout}>
                            <LogOut size={20} />
                            <span>Logout</span>
                        </button>
                    </nav>

                    <div className="sidebar-footer">
                        <div className="user-badge">
                            <span className="badge-label">Badge:</span>
                            <span className="badge-number">{user.badge}</span>
                        </div>
                        <div className="user-department">
                            {user.department.replace('_', ' ')}
                        </div>
                    </div>
                </aside>

                {/* Mobile menu overlay */}
                {mobileMenuOpen && (
                    <div
                        className="mobile-overlay"
                        onClick={closeMobileMenu}
                    ></div>
                )}

                {/* Main Content */}
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}