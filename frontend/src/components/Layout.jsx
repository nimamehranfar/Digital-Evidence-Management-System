import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Home, Briefcase, Upload, Search, Users, User, LogOut, Menu, X, Shield, Building2 } from "lucide-react";
import { useMemo, useState } from "react";
import { USE_MOCK } from "../api/config";

export default function Layout() {
  const { user, logout, isAdmin, isDetective, isCaseOfficer, isProsecutor } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isInvestigative = isDetective || isCaseOfficer || isProsecutor;

  const navigationLinks = useMemo(() => {
    const links = [];

    // Admin has governance-only access
    if (isAdmin) {
      links.push({ to: "/departments", icon: Building2, label: "Departments" });
      links.push({ to: "/users", icon: Users, label: "Users" });
      links.push({ to: "/profile", icon: User, label: "Profile" });
      return links;
    }

    // Investigative roles
    links.push({ to: "/dashboard", icon: Home, label: "Dashboard" });
    links.push({ to: "/departments", icon: Building2, label: "Departments" });
    links.push({ to: "/cases", icon: Briefcase, label: "Cases" });
    if (isDetective || isCaseOfficer) links.push({ to: "/upload", icon: Upload, label: "Upload Evidence" });
    links.push({ to: "/search", icon: Search, label: "Search" });
    links.push({ to: "/profile", icon: User, label: "Profile" });

    return links;
  }, [isAdmin, isDetective, isCaseOfficer, isProsecutor]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const toggleMobileMenu = () => setMobileMenuOpen((v) => !v);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button className="mobile-menu-toggle" onClick={toggleMobileMenu} aria-label="Toggle menu">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="logo">
              <Shield size={28} />
              <span className="logo-text">Digital Evidence System</span>
            </div>
          </div>

          <div className="header-right">
            {USE_MOCK ? <span className="badge warning">MOCK MODE</span> : null}
            <div className="user-info">
              <span className="user-name">{user?.name || "User"}</span>
              <span className="user-role">
                {user?.roles?.join(", ") || "role"}
                {user?.department ? ` • ${user.department}` : ""}
              </span>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="main-container">
        <aside className={`sidebar ${mobileMenuOpen ? "open" : ""}`}>
          <nav className="navigation">
            {navigationLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                onClick={closeMobileMenu}
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="content">
          {!isInvestigative && !isAdmin ? (
            <div className="page-container">
              <div className="card">
                <h2>Not authorized</h2>
                <p>No valid role assigned. Ask an admin to assign an app role in Entra ID.</p>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}
