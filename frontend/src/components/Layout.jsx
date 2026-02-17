import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard, Briefcase, Upload, Search,
  Users, User, LogOut, Menu, X, Shield, Building2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { USE_MOCK } from "../api/config";

export default function Layout() {
  const { user, logout, isAdmin, isDetective, isCaseOfficer, isProsecutor, isInvestigative } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = useMemo(() => {
    const links = [];
    if (isAdmin) {
      links.push({ to: "/departments", icon: Building2, label: "Departments" });
      links.push({ to: "/users",       icon: Users,     label: "Users" });
      links.push({ to: "/profile",     icon: User,      label: "Profile" });
      return links;
    }
    links.push({ to: "/dashboard",   icon: LayoutDashboard, label: "Dashboard" });
    links.push({ to: "/departments", icon: Building2,       label: "Departments" });
    links.push({ to: "/cases",       icon: Briefcase,       label: "Cases" });
    if (isDetective || isCaseOfficer) {
      links.push({ to: "/upload", icon: Upload, label: "Upload Evidence" });
    }
    links.push({ to: "/search",  icon: Search, label: "Search" });
    links.push({ to: "/profile", icon: User,   label: "Profile" });
    return links;
  }, [isAdmin, isDetective, isCaseOfficer, isProsecutor]);

  async function handleLogout() {
    try { await logout(); } catch (_) {}
    navigate("/login");
  }

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="layout">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <button
              className="mobile-menu-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div className="logo">
              <Shield size={26} />
              <span className="logo-text">DEMS</span>
            </div>
          </div>

          <div className="header-right">
            {USE_MOCK && (
              <span className="badge badge-warning">MOCK MODE</span>
            )}
            <div className="user-info">
              <div className="user-avatar">{initials}</div>
              <div className="user-details">
                <span className="user-name">{user?.name || "User"}</span>
                <span className="user-role">
                  {(user?.roles || []).join(", ") || "—"}
                  {user?.department ? ` · ${user.department}` : ""}
                </span>
              </div>
            </div>
            <button className="btn-icon logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Body                                                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="main-container">
        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="mobile-overlay"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
          <nav className="navigation">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `nav-link${isActive ? " nav-link-active" : ""}`
                }
                onClick={() => setMobileOpen(false)}
              >
                <link.icon size={20} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="content">
          {!isInvestigative && !isAdmin ? (
            <div className="page-container centered-message">
              <div className="card card-compact" style={{ textAlign: "center" }}>
                <Shield size={40} style={{ color: "var(--color-warning)", marginBottom: "1rem" }} />
                <h2>No role assigned</h2>
                <p className="muted">
                  Your account has no app role. Ask an admin to assign one in the Entra ID portal.
                </p>
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
