import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const ACCENT = "#ff6a3d";

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

const C = {
  bg: "#0e0d10",
  bg2: "#15131a",
  border: "rgba(255,255,255,0.10)",
  borderS: "rgba(255,255,255,0.06)",
  hairline: "rgba(255,255,255,0.06)",
  text: "#f1ecdf",
  text2: "rgba(241,236,223,0.62)",
  text3: "rgba(241,236,223,0.38)",
  danger: "#ff7766",
};

function GDriveIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.71 3h8.58L22 12.86h-8.57z" fill="#FBBC04" />
      <path d="M2 16.71 6.29 9.4l4.28 7.31H2z" fill="#34A853" />
      <path d="M9.43 21 5.14 13.71h13.43L14.29 21z" fill="#4285F4" />
    </svg>
  );
}
function DropboxIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0061ff" d="M6 2 1 5.5 6 9l5-3.5zM18 2l-5 3.5L18 9l5-3.5zM1 12.5 6 16l5-3.5L6 9zM18 9l-5 3.5L18 16l5-3.5zM6 17.1 11 20.6l5-3.5-5-3.5z" />
    </svg>
  );
}
function OneDriveIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#0078d4" d="M10.5 6a6 6 0 0 1 5.7 4.05A4.5 4.5 0 0 1 19.5 18.5h-13A4.5 4.5 0 0 1 4.7 9.9 6 6 0 0 1 10.5 6z" />
    </svg>
  );
}
function ICloudIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#9aa1aa" d="M7.5 16.5a4 4 0 0 1-.6-7.95 5.5 5.5 0 0 1 10.7-.5A3.5 3.5 0 0 1 17 16.5z" />
    </svg>
  );
}
function BoxIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2" fill="#0061d5" />
      <circle cx="9" cy="14" r="1.5" fill="#fff" />
      <circle cx="14" cy="14" r="1.5" fill="#fff" />
    </svg>
  );
}

const PROVIDERS = [
  { id: "gdrive",   name: "Google Drive",  Icon: GDriveIcon },
  { id: "dropbox",  name: "Dropbox",       Icon: DropboxIcon },
  { id: "onedrive", name: "OneDrive",      Icon: OneDriveIcon },
  { id: "icloud",   name: "iCloud Drive",  Icon: ICloudIcon },
  { id: "box",      name: "Box",           Icon: BoxIcon },
];

function BrandMark() {
  return (
    <span aria-hidden="true" style={{
      width: 28, height: 28, borderRadius: "50%", display: "inline-block", flexShrink: 0,
      background: `radial-gradient(circle at center, ${C.bg2} 0 4px, ${ACCENT} 4.5px 6px, transparent 6.2px),
        repeating-radial-gradient(circle at center, ${C.text} 0 .8px, transparent .8px 3px), ${C.text}`,
      boxShadow: `inset 0 0 0 1px ${C.text}`,
    }} />
  );
}

function Vinyl() {
  return (
    <div style={{ position: "relative", width: "min(320px, 78%)", aspectRatio: "1" }}>
      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: `radial-gradient(circle at center, ${ACCENT} 0 7%, ${C.bg2} 7.2% 8.5%, transparent 8.7%),
          repeating-radial-gradient(circle at center, rgba(255,255,255,0.04) 0 1.5px, transparent 1.5px 5px), #0a0a0c`,
        boxShadow: `0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 1px ${C.border}`,
        animation: "mm-vinyl-spin 28s linear infinite",
      }} />
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        width: 6, height: 6, borderRadius: "50%",
        background: C.bg, transform: "translate(-50%,-50%)",
      }} />
    </div>
  );
}

function HeroPanel() {
  return (
    <div className="mm-hero-panel" style={{
      position: "relative", overflow: "hidden",
      background: `radial-gradient(120% 80% at 20% 10%, ${hexA(ACCENT, 0.18)} 0%, transparent 55%), ${C.bg}`,
      padding: "36px 40px",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      minWidth: 0,
    }}>
      {/* Brand */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        color: C.text, fontFamily: '"Instrument Serif", serif', fontSize: 22,
      }}>
        <BrandMark />
        <span>MusicManager</span>
        <span style={{
          marginLeft: 8, fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
          color: C.text3, alignSelf: "flex-end", marginBottom: 3,
        }}>id3 · cloud · tagger</span>
      </div>

      {/* Vinyl */}
      <div style={{
        position: "relative", flex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "24px 0",
      }}>
        <Vinyl />
      </div>

      {/* Tagline */}
      <div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontSize: 32, lineHeight: 1.1,
          letterSpacing: "-0.01em", color: C.text, maxWidth: "22ch", margin: "0 0 12px",
        }}>
          Clean tags{" "}
          <em style={{ color: ACCENT, fontStyle: "italic" }}>
            where your music already lives.
          </em>
        </div>
        <p style={{
          color: C.text2, fontSize: 14, lineHeight: 1.55,
          margin: "0 0 22px", maxWidth: "38ch",
        }}>
          Sign in to your MusicManager account. You'll connect Google Drive, Dropbox,
          OneDrive or any other cloud as a{" "}
          <strong style={{ color: C.text }}>source</strong> from inside the app.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PROVIDERS.map(({ id, name, Icon }) => (
            <span key={id} title={name} style={{
              width: 36, height: 36, borderRadius: 9, background: C.bg2,
              border: `1px solid ${C.borderS}`,
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={18} />
            </span>
          ))}
          <span style={{
            height: 36, padding: "0 10px", borderRadius: 9,
            border: `1px dashed ${C.border}`, color: C.text3,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5, letterSpacing: ".06em",
            display: "inline-flex", alignItems: "center",
          }}>+ MORE</span>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <span style={{
          fontSize: 11.5, fontFamily: '"JetBrains Mono", monospace',
          letterSpacing: ".08em", textTransform: "uppercase", color: C.text2,
        }}>{label}</span>
        {hint && <span style={{ fontSize: 11, color: C.text3 }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const baseInputStyle = {
  appearance: "none", border: `1px solid ${C.border}`,
  background: C.bg, color: C.text,
  padding: "12px 14px", borderRadius: 10, fontSize: 14,
  fontFamily: "inherit", outline: "none",
  width: "100%", boxSizing: "border-box",
};

export default function LoginPage() {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const busy = submitting || loading;
  const displayErr = formError || error;

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!username.trim()) { setFormError("Enter your username."); return; }
    if (isSignup && !email.includes("@")) { setFormError("Enter a valid email."); return; }
    if (password.length < 6) { setFormError("Password must be 6+ characters."); return; }
    setSubmitting(true);
    try {
      if (isSignup) {
        await register(username, email, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setFormError(err?.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <style>{`
        @keyframes mm-vinyl-spin { to { transform: rotate(360deg) } }
        .mm-login-root {
          min-height: 100vh;
          display: grid;
          grid-template-columns: minmax(360px, 1fr) minmax(440px, 520px);
          background: ${C.bg};
          font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        @media (max-width: 860px) {
          .mm-login-root { grid-template-columns: 1fr; }
          .mm-hero-panel { display: none !important; }
        }
        .mm-input:focus {
          border-color: ${ACCENT} !important;
          box-shadow: 0 0 0 3px ${hexA(ACCENT, 0.18)} !important;
        }
      `}</style>

      <div className="mm-login-root">
        <HeroPanel />

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex", flexDirection: "column",
            background: C.bg2, borderLeft: `1px solid ${C.hairline}`,
            padding: "40px 44px", boxSizing: "border-box", minWidth: 0,
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
            <span style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              letterSpacing: ".14em", textTransform: "uppercase", color: C.text3,
            }}>
              {isSignup ? "Create your account" : "Welcome back"}
            </span>
            <h1 style={{
              fontFamily: '"Instrument Serif", serif', fontSize: 34,
              fontWeight: 400, margin: 0, letterSpacing: "-0.01em",
              color: C.text, whiteSpace: "nowrap",
            }}>
              {isSignup ? "Sign up" : "Sign in"}
            </h1>
            <p style={{ margin: "4px 0 0", color: C.text2, fontSize: 13.5, lineHeight: 1.5 }}>
              {isSignup
                ? "Just a username — you'll connect your cloud storage from inside the app."
                : "Use your MusicManager account. Cloud sources are added after sign-in."}
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <FieldInput label="Username">
              <input
                className="mm-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="jess"
                autoComplete="username"
                style={baseInputStyle}
              />
            </FieldInput>

            {isSignup && (
              <FieldInput label="Email">
                <input
                  className="mm-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@studio.fm"
                  autoComplete="email"
                  style={baseInputStyle}
                />
              </FieldInput>
            )}

            <FieldInput label="Password">
              <input
                className="mm-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignup ? "new-password" : "current-password"}
                style={baseInputStyle}
              />
            </FieldInput>

            {/* Keep signed in */}
            <div
              role="checkbox"
              aria-checked={keepLoggedIn}
              onClick={() => setKeepLoggedIn(!keepLoggedIn)}
              style={{
                display: "flex", alignItems: "center", gap: 10, marginTop: 2,
                color: C.text2, fontSize: 13, userSelect: "none", cursor: "pointer",
              }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `1.5px solid ${keepLoggedIn ? ACCENT : C.border}`,
                background: keepLoggedIn ? ACCENT : "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 11,
              }}>
                {keepLoggedIn ? "✓" : ""}
              </span>
              Keep me signed in
            </div>

            {/* Error */}
            {displayErr && (
              <div style={{
                color: C.danger,
                background: hexA(C.danger, 0.10),
                border: `1px solid ${hexA(C.danger, 0.35)}`,
                borderRadius: 8, padding: "8px 12px", fontSize: 12.5,
              }}>
                {displayErr}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy}
              style={{
                appearance: "none", border: "none",
                background: ACCENT, color: "#fff",
                padding: "13px 18px", borderRadius: 10,
                fontSize: 14.5, fontWeight: 600,
                cursor: busy ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, marginTop: 6,
                opacity: busy ? 0.65 : 1,
                fontFamily: "inherit",
                transition: "opacity .15s",
              }}
            >
              {busy
                ? (isSignup ? "Creating account…" : "Signing in…")
                : (isSignup ? "Create account →" : "Sign in →")}
            </button>
          </div>

          <div style={{ flex: 1 }} />

          {/* Footer toggle */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 32, paddingTop: 20, borderTop: `1px solid ${C.hairline}`,
            color: C.text3,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11, letterSpacing: ".06em",
          }}>
            <span>{isSignup ? "Already have an account?" : "New to MusicManager?"}</span>
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setFormError(""); }}
              style={{
                appearance: "none", background: "transparent", border: "none",
                color: ACCENT, cursor: "pointer",
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                letterSpacing: ".06em", textTransform: "uppercase",
              }}
            >
              {isSignup ? "Sign in →" : "Create account →"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
