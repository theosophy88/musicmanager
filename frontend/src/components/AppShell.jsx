import { useLocation, NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePlayer } from "../hooks/usePlayer";
import PlayerBar from "./PlayerBar";
import { C, ACCENT, hexA } from "../theme";

const NAV = [
  { id: "dashboard", label: "Dashboard", to: "/dashboard" },
  { id: "sources",   label: "Sources",   to: "/sources"   },
  { id: "library",   label: "Library",   to: "/library"   },
  { id: "files",     label: "Files",     to: "/files"     },
  { id: "history",   label: "History",   to: "/history"   },
  { id: "admin",     label: "Admin",     to: "/admin",    adminOnly: true },
  { id: "settings",  label: "Settings",  to: "/settings"  },
];

function Mark() {
  return (
    <span aria-hidden="true" style={{
      width: 28, height: 28, borderRadius: "50%", display: "inline-block", flexShrink: 0,
      background: `radial-gradient(circle at center, ${C.bg2} 0 4px, ${ACCENT} 4.5px 6px, transparent 6.2px),
        repeating-radial-gradient(circle at center, ${C.text} 0 .8px, transparent .8px 3px), ${C.text}`,
      boxShadow: `inset 0 0 0 1px ${C.text}`,
    }} />
  );
}

export default function AppShell({ title, subtitle, headerRight, children }) {
  const { user, logout } = useAuth();
  const { track } = usePlayer();
  const location = useLocation();

  const active = location.pathname.replace(/^\//, "").split("/")[0] || "dashboard";
  const email = user?.email || user?.username || "";
  const navItems = NAV.filter(n => !n.adminOnly || user?.is_admin);

  return (
    <div style={{
      width: "100%", height: "100vh", background: C.bg, color: C.text,
      fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
      display: "grid", gridTemplateColumns: "220px 1fr", overflow: "hidden",
    }}>
      {/* Sidebar */}
      <aside style={{
        background: C.bg2, borderRight: `1px solid ${C.hairline}`,
        display: "flex", flexDirection: "column", padding: "18px 14px",
        gap: 4, minHeight: 0, overflowY: "auto",
      }}>
        <NavLink to="/dashboard" style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "0 6px 14px", textDecoration: "none", color: "inherit",
        }}>
          <Mark />
          <span style={{ fontFamily: '"Instrument Serif", serif', fontSize: 18, color: C.text }}>
            MusicManager
          </span>
        </NavLink>

        {navItems.map(n => {
          const isActive = active === n.id;
          return (
            <NavLink key={n.id} to={n.to} style={{
              padding: "9px 10px", borderRadius: 8, textDecoration: "none",
              background: isActive ? hexA(ACCENT, .12) : "transparent",
              color: isActive ? C.text : C.text2,
              display: "flex", alignItems: "center", gap: 10, fontSize: 13.5,
              borderLeft: isActive ? `2px solid ${ACCENT}` : "2px solid transparent",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: isActive ? ACCENT : C.text3,
              }} />
              <span>{n.label}</span>
            </NavLink>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* User footer */}
        <div style={{
          marginTop: 8, padding: "10px 8px", borderTop: `1px solid ${C.hairline}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{
            width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
            background: hexA(ACCENT, .25), color: ACCENT, fontWeight: 700, fontSize: 13,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            {(email[0] || "u").toUpperCase()}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, color: C.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{email}</div>
            <button onClick={logout} style={{
              appearance: "none", background: "transparent", border: "none", padding: 0,
              color: C.text3, fontFamily: '"JetBrains Mono", monospace',
              fontSize: 10, cursor: "pointer", letterSpacing: ".08em", textTransform: "uppercase",
            }}>sign out</button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0 }}>
        {/* Page header */}
        <header style={{
          padding: "16px 28px", borderBottom: `1px solid ${C.hairline}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 14, flexShrink: 0,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              fontFamily: '"Instrument Serif", serif', fontSize: 24, fontWeight: 400,
              margin: 0, letterSpacing: "-0.01em", color: C.text,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{title}</h2>
            {subtitle && (
              <div style={{ color: C.text2, fontSize: 12.5, marginTop: 2 }}>{subtitle}</div>
            )}
          </div>
          {headerRight && <div style={{ flexShrink: 0 }}>{headerRight}</div>}
        </header>

        {/* Scrollable content */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: track ? 80 : 0 }}>
          {children}
        </div>
      </main>

      {/* Fixed player bar at bottom of viewport */}
      {track && <PlayerBar />}
    </div>
  );
}
