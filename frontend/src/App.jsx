import React from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { usePlayer } from "./hooks/usePlayer";
import Dashboard from "./pages/Dashboard";
import FileManager from "./pages/FileManager";
import Sources from "./pages/Sources";
import Settings from "./pages/Settings";
import PlayerBar from "./components/PlayerBar";

/* ── Auth guard ─────────────────────────────────────────────── */
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenSpinner />;
  return user ? children : <Navigate to="/login" replace />;
}

/* ── Login page ─────────────────────────────────────────────── */
const LOGIN_STYLES = `
  .mm-login-bg {
    min-height: 100vh;
    background:
      linear-gradient(rgba(58,42,28,.07) 1px, transparent 1px) 0 0 / 24px 24px,
      linear-gradient(90deg, rgba(58,42,28,.07) 1px, transparent 1px) 0 0 / 24px 24px,
      #f6f3ec;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: 'Space Grotesk', ui-sans-serif, system-ui, sans-serif;
    color: #2a1d12;
  }
  .mm-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
    text-decoration: none;
  }
  .mm-brand-mark {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background:
      radial-gradient(circle at center, #f6f3ec 0 5px, #2a1d12 5.5px 7px, transparent 7.2px),
      repeating-radial-gradient(circle at center, #2a1d12 0 1px, transparent 1px 3.5px),
      #2a1d12;
    box-shadow: inset 0 0 0 1.5px #2a1d12;
    flex-shrink: 0;
  }
  .mm-brand-name {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 26px;
    color: #2a1d12;
    letter-spacing: .01em;
    line-height: 1;
  }
  .mm-brand-sub {
    font-family: 'JetBrains Mono', 'Courier New', monospace;
    font-size: 10px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #5a4a3a;
    margin-left: 2px;
    align-self: flex-end;
    margin-bottom: 2px;
  }
  .mm-card {
    width: 100%;
    max-width: 380px;
    background: rgba(255,255,255,0.72);
    border: 1.5px solid rgba(42,29,18,0.18);
    border-radius: 10px;
    padding: 28px 28px 26px;
    box-shadow: 2px 4px 0 rgba(42,29,18,0.08);
  }
  .mm-mode-tabs {
    display: flex;
    background: rgba(42,29,18,0.06);
    border: 1px solid rgba(42,29,18,0.10);
    border-radius: 8px;
    padding: 3px;
    margin-bottom: 22px;
    gap: 3px;
  }
  .mm-tab {
    flex: 1;
    padding: 7px 12px;
    border-radius: 6px;
    border: none;
    background: transparent;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 500;
    color: #5a4a3a;
    cursor: pointer;
    transition: all .15s;
    letter-spacing: .01em;
  }
  .mm-tab.active {
    background: #f6f3ec;
    color: #2a1d12;
    box-shadow: 0 1px 3px rgba(42,29,18,0.10), 0 0 0 1px rgba(42,29,18,0.10);
  }
  .mm-label {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: #5a4a3a;
    margin-bottom: 5px;
  }
  .mm-input {
    width: 100%;
    background: rgba(255,255,255,0.80);
    border: 1.5px solid rgba(42,29,18,0.22);
    border-radius: 5px;
    padding: 8px 12px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    color: #2a1d12;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    box-sizing: border-box;
  }
  .mm-input::placeholder { color: rgba(42,29,18,0.35); }
  .mm-input:focus {
    border-color: #c44a1f;
    box-shadow: 0 0 0 3px rgba(196,74,31,.12);
  }
  .mm-forgot {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c44a1f;
    text-decoration: none;
    letter-spacing: .04em;
    float: right;
    margin-top: 6px;
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
  }
  .mm-forgot:hover { text-decoration: underline; }
  .mm-btn-primary {
    width: 100%;
    background: #c44a1f;
    border: 1.5px solid #c44a1f;
    border-radius: 5px;
    padding: 10px 16px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    letter-spacing: .02em;
    transition: background .15s, transform .08s;
    margin-top: 4px;
  }
  .mm-btn-primary:hover:not(:disabled) { background: #b03a12; }
  .mm-btn-primary:active:not(:disabled) { transform: translateY(1px); }
  .mm-btn-primary:disabled { opacity: .55; cursor: not-allowed; }
  .mm-error {
    font-size: 12.5px;
    color: #b03a2a;
    background: rgba(196,74,31,.08);
    border: 1px solid rgba(196,74,31,.25);
    border-radius: 5px;
    padding: 8px 12px;
    margin-bottom: 4px;
  }
  .mm-switch-link {
    text-align: center;
    margin-top: 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    color: #5a4a3a;
    letter-spacing: .02em;
  }
  .mm-switch-link button {
    background: none;
    border: none;
    color: #c44a1f;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    padding: 0;
    letter-spacing: inherit;
  }
  .mm-switch-link button:hover { text-decoration: underline; }
  .mm-field { margin-bottom: 16px; }
  .mm-field:last-of-type { margin-bottom: 0; }
  .mm-password-row { display: flex; align-items: baseline; justify-content: space-between; }
`;

function LoginPage() {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = React.useState("login");
  const [form, setForm] = React.useState({ username: "", email: "", password: "" });
  const [formError, setFormError] = React.useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register(form.username, form.email, form.password);
      }
    } catch (err) {
      setFormError(err?.message || "Authentication failed");
    }
  }

  return (
    <>
      <style>{LOGIN_STYLES}</style>
      <div className="mm-login-bg">
        {/* Brand */}
        <div className="mm-brand">
          <span className="mm-brand-mark" aria-hidden="true" />
          <span className="mm-brand-name">MusicManager</span>
          <span className="mm-brand-sub">id3 · cloud · tagger</span>
        </div>

        {/* Card */}
        <div className="mm-card">
          {/* Mode toggle */}
          <div className="mm-mode-tabs">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setFormError(""); }}
                className={`mm-tab${mode === m ? " active" : ""}`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mm-field">
              <label className="mm-label">Username</label>
              <input
                className="mm-input"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="your username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            {mode === "register" && (
              <div className="mm-field">
                <label className="mm-label">Email</label>
                <input
                  type="email"
                  className="mm-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@studio.fm"
                  required
                />
              </div>
            )}

            <div className="mm-field" style={{ marginBottom: mode === "login" ? 0 : 16 }}>
              <div className="mm-password-row">
                <label className="mm-label">Password</label>
                {mode === "login" && (
                  <button type="button" className="mm-forgot">forgot?</button>
                )}
              </div>
              <input
                type="password"
                className="mm-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {(formError || error) && (
              <div className="mm-error" style={{ marginTop: 14 }}>
                {formError || error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mm-btn-primary"
              style={{ marginTop: formError || error ? 10 : 18 }}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign in →" : "Create account →"}
            </button>
          </form>

          <div className="mm-switch-link">
            {mode === "login" ? (
              <>no account?{" "}<button onClick={() => { setMode("register"); setFormError(""); }}>create one</button></>
            ) : (
              <>already have an account?{" "}<button onClick={() => { setMode("login"); setFormError(""); }}>sign in</button></>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Nav link helper ────────────────────────────────────────── */
function SideLink({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isActive
            ? "bg-violet-600/20 text-violet-300"
            : "text-gray-400 hover:text-white hover:bg-gray-800"
        }`
      }
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  );
}

/* ── Sidebar ────────────────────────────────────────────────── */
function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
        <svg className="w-6 h-6 text-violet-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6Z"/>
        </svg>
        <span className="font-bold text-white text-sm tracking-tight">MusicManager</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        <SideLink
          to="/dashboard"
          label="Dashboard"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        />
        <SideLink
          to="/files"
          label="File Manager"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          }
        />
        <SideLink
          to="/sources"
          label="Sources"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          }
        />
        <SideLink
          to="/settings"
          label="Settings"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            {user?.is_admin && (
              <p className="text-xs text-violet-400">Admin</p>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

/* ── Full screen spinner ─────────────────────────────────────── */
function FullScreenSpinner() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/* ── Main layout ─────────────────────────────────────────────── */
function AppLayout() {
  const { track: currentTrack } = usePlayer();

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <main className={`flex-1 overflow-y-auto ${currentTrack ? "pb-24" : ""}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/files" element={<FileManager />} />
          <Route path="/sources" element={<Sources />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  );
}

/* ── Root App ────────────────────────────────────────────────── */

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
