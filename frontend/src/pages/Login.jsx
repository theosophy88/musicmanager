import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

const ACCENT = "#ff6a3d";
const C = {
  bg:       "#0e0d10",
  bg2:      "#15131a",
  panel:    "rgba(255,255,255,0.04)",
  border:   "rgba(255,255,255,0.10)",
  borderS:  "rgba(255,255,255,0.06)",
  text:     "#f1ecdf",
  text2:    "rgba(241,236,223,0.62)",
  text3:    "rgba(241,236,223,0.38)",
  accentInk:"#fff",
  danger:   "#ff7766",
  hairline: "rgba(255,255,255,0.06)",
};

function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const PROVIDERS = [
  { id:"gdrive",   name:"Google Drive",
    icon:(s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24"><path d="M7.71 3h8.58L22 12.86h-8.57z" fill="#FBBC04"/><path d="M2 16.71 6.29 9.4l4.28 7.31H2z" fill="#34A853"/><path d="M9.43 21 5.14 13.71h13.43L14.29 21z" fill="#4285F4"/></svg>) },
  { id:"dropbox",  name:"Dropbox",
    icon:(s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24"><path fill="#0061ff" d="M6 2 1 5.5 6 9l5-3.5zM18 2l-5 3.5L18 9l5-3.5zM1 12.5 6 16l5-3.5L6 9zM18 9l-5 3.5L18 16l5-3.5zM6 17.1 11 20.6l5-3.5-5-3.5z"/></svg>) },
  { id:"onedrive", name:"OneDrive",
    icon:(s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24"><path fill="#0078d4" d="M10.5 6a6 6 0 0 1 5.7 4.05A4.5 4.5 0 0 1 19.5 18.5h-13A4.5 4.5 0 0 1 4.7 9.9 6 6 0 0 1 10.5 6z"/></svg>) },
  { id:"icloud",   name:"iCloud Drive",
    icon:(s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24"><path fill="#9aa1aa" d="M7.5 16.5a4 4 0 0 1-.6-7.95 5.5 5.5 0 0 1 10.7-.5A3.5 3.5 0 0 1 17 16.5z"/></svg>) },
  { id:"box",      name:"Box",
    icon:(s=22)=>(<svg width={s} height={s} viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="12" rx="2" fill="#0061d5"/><circle cx="9" cy="14" r="1.5" fill="#fff"/><circle cx="14" cy="14" r="1.5" fill="#fff"/></svg>) },
];

function Mark() {
  return (
    <span aria-hidden="true" style={{
      width:28, height:28, borderRadius:"50%", display:"inline-block",
      background:`radial-gradient(circle at center, ${C.bg2} 0 4px, ${ACCENT} 4.5px 6px, transparent 6.2px),
        repeating-radial-gradient(circle at center, ${C.text} 0 .8px, transparent .8px 3px), ${C.text}`,
      boxShadow:`inset 0 0 0 1px ${C.text}`, flexShrink:0,
    }}/>
  );
}

function Vinyl() {
  return (
    <div style={{ position:"relative", width:"min(300px, 72%)", aspectRatio:"1" }}>
      <div style={{
        position:"absolute", inset:0, borderRadius:"50%",
        background:`radial-gradient(circle at center, ${ACCENT} 0 7%, ${C.bg2} 7.2% 8.5%, transparent 8.7%),
          repeating-radial-gradient(circle at center, rgba(255,255,255,0.04) 0 1.5px, transparent 1.5px 5px), #0a0a0c`,
        boxShadow:`0 30px 80px rgba(0,0,0,0.55), inset 0 0 0 1px ${C.border}`,
        animation:"mm-spin 28s linear infinite",
      }}/>
      <div style={{
        position:"absolute", left:"50%", top:"50%", width:6, height:6,
        borderRadius:"50%", background:C.bg, transform:"translate(-50%,-50%)"
      }}/>
    </div>
  );
}

function HeroPanel() {
  return (
    <div style={{
      position:"relative", overflow:"hidden",
      background:`radial-gradient(120% 80% at 20% 10%, ${hexA(ACCENT, .18)} 0%, transparent 55%), ${C.bg}`,
      padding:"36px 40px", display:"flex", flexDirection:"column",
      justifyContent:"space-between", minWidth:0,
    }}>
      <div style={{
        display:"flex", alignItems:"center", gap:10,
        color:C.text, fontFamily:'"Instrument Serif", serif', fontSize:22,
      }}>
        <Mark />
        <span>MusicManager</span>
        <span style={{
          marginLeft:8, fontFamily:'"JetBrains Mono", monospace', fontSize:10,
          letterSpacing:".14em", textTransform:"uppercase", color:C.text3,
          alignSelf:"flex-end", marginBottom:3,
        }}>id3 · cloud · tagger</span>
      </div>

      <div style={{
        position:"relative", flex:1, display:"flex",
        alignItems:"center", justifyContent:"center", margin:"24px 0",
      }}>
        <Vinyl />
      </div>

      <div>
        <div style={{
          fontFamily:'"Instrument Serif", serif', fontSize:34, lineHeight:1.05,
          letterSpacing:"-0.01em", color:C.text, maxWidth:"22ch", margin:"0 0 12px",
        }}>
          Clean tags{" "}
          <em style={{ color:ACCENT, fontStyle:"italic" }}>where your music already lives.</em>
        </div>
        <p style={{ color:C.text2, fontSize:14.5, lineHeight:1.5, margin:"0 0 22px", maxWidth:"38ch" }}>
          Sign in to your MusicManager account. You&apos;ll connect Google Drive, Dropbox, OneDrive
          or any other cloud as a <b style={{ color:C.text }}>source</b> from inside the app.
        </p>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {PROVIDERS.map(p => (
            <span key={p.id} title={p.name} style={{
              width:36, height:36, borderRadius:9, background:C.bg2,
              border:`1px solid ${C.borderS}`,
              display:"inline-flex", alignItems:"center", justifyContent:"center",
            }}>{p.icon(18)}</span>
          ))}
          <span style={{
            height:36, padding:"0 10px", borderRadius:9, background:"transparent",
            border:`1px dashed ${C.border}`, color:C.text3,
            fontFamily:'"JetBrains Mono", monospace', fontSize:10.5,
            letterSpacing:".06em", display:"inline-flex", alignItems:"center",
          }}>+ MORE</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label style={{ display:"flex", flexDirection:"column", gap:6 }}>
      <span style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:10 }}>
        <span style={{
          fontSize:11.5, fontFamily:'"JetBrains Mono", monospace',
          letterSpacing:".08em", textTransform:"uppercase", color:C.text2,
        }}>{label}</span>
        {hint && <span style={{ fontSize:11, color:C.text3 }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputSty = {
  appearance:"none", border:`1px solid ${C.border}`, background:C.bg2, color:C.text,
  padding:"12px 14px", borderRadius:10, fontSize:14, fontFamily:"inherit",
  outline:"none", transition:"border-color .15s", width:"100%", boxSizing:"border-box",
};

export default function LoginPage() {
  const { login, register, loading, error } = useAuth();
  const [mode, setMode]               = useState("signin");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [name, setName]               = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [formError, setFormError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!email.trim()) { setFormError("Enter your username or email."); return; }
    if (password.length < 6) { setFormError("Password must be 6+ characters."); return; }
    if (isSignup && !name.trim()) { setFormError("Tell us your name."); return; }
    setSubmitting(true);
    try {
      if (isSignup) {
        await register(email, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setFormError(err?.message || "Authentication failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayError = formError || error;
  const busy = submitting || loading;

  return (
    <div style={{
      width:"100%", height:"100vh", background:C.bg, color:C.text, overflow:"hidden",
      display:"grid", gridTemplateColumns:"minmax(360px, 1fr) minmax(440px, 520px)",
      fontFamily:'"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
    }}>
      <HeroPanel />

      <div style={{
        display:"flex", flexDirection:"column",
        background:C.bg2, borderLeft:`1px solid ${C.hairline}`,
        minWidth:0, minHeight:0,
      }}>
        <form onSubmit={handleSubmit} style={{
          display:"flex", flexDirection:"column", flex:1, minHeight:0,
          padding:"32px 40px", width:"100%", boxSizing:"border-box",
        }}>
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:20 }}>
            <span style={{
              fontFamily:'"JetBrains Mono", monospace', fontSize:10.5,
              letterSpacing:".14em", textTransform:"uppercase", color:C.text3,
            }}>{isSignup ? "Create your account" : "Welcome back"}</span>
            <h2 style={{
              fontFamily:'"Instrument Serif", serif', fontSize:34, fontWeight:400,
              margin:0, letterSpacing:"-0.01em", color:C.text, whiteSpace:"nowrap",
            }}>{isSignup ? "Sign up" : "Sign in"}</h2>
            <p style={{ margin:"4px 0 0", color:C.text2, fontSize:13.5 }}>
              {isSignup
                ? "Just an email — you’ll connect your cloud storage from inside the app."
                : "Use your MusicManager account. Cloud sources are added in the next screen."}
            </p>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            {isSignup && (
              <Field label="Your name">
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="Jess Park" autoComplete="name" style={inputSty}
                />
              </Field>
            )}

            <Field label={isSignup ? "Email" : "Username"}>
              <input
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder={isSignup ? "you@studio.fm" : "your username"}
                type={isSignup ? "email" : "text"}
                autoComplete={isSignup ? "email" : "username"}
                style={inputSty}
              />
            </Field>

            <Field
              label="Password"
              hint={!isSignup && (
                <span style={{ color:ACCENT, fontSize:11, cursor:"pointer" }}>Forgot?</span>
              )}
            >
              <input
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                style={inputSty}
              />
            </Field>

            <label style={{
              display:"flex", alignItems:"center", gap:10, marginTop:2,
              color:C.text2, fontSize:13, cursor:"pointer", userSelect:"none",
            }}>
              <span
                onClick={() => setKeepLoggedIn(v => !v)}
                style={{
                  width:16, height:16, borderRadius:4, flexShrink:0,
                  border:`1.5px solid ${keepLoggedIn ? ACCENT : C.border}`,
                  background: keepLoggedIn ? ACCENT : "transparent",
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontSize:11,
                }}
              >{keepLoggedIn ? "✓" : ""}</span>
              Keep me signed in
            </label>

            {displayError && (
              <div style={{
                color:C.danger, background:hexA(C.danger, .10),
                border:`1px solid ${hexA(C.danger, .35)}`,
                borderRadius:8, padding:"8px 12px", fontSize:12.5,
              }}>{displayError}</div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                appearance:"none", border:"none", background:ACCENT, color:C.accentInk,
                padding:"13px 18px", borderRadius:10, fontSize:14.5, fontWeight:600,
                cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                gap:8, marginTop:6, opacity:busy ? .65 : 1,
                transition:"opacity .15s",
              }}
            >{busy ? "Signing in…" : (isSignup ? "Create account →" : "Sign in →")}</button>
          </div>

          <div style={{ flex:1 }} />

          <div style={{
            display:"flex", justifyContent:"space-between", alignItems:"center",
            marginTop:24, paddingTop:18, borderTop:`1px solid ${C.hairline}`,
            color:C.text3, fontFamily:'"JetBrains Mono", monospace',
            fontSize:11, letterSpacing:".06em",
          }}>
            <span>{isSignup ? "Already have an account?" : "New to MusicManager?"}</span>
            <button
              type="button"
              onClick={() => { setMode(isSignup ? "signin" : "signup"); setFormError(""); }}
              style={{
                appearance:"none", background:"transparent", border:"none",
                color:ACCENT, cursor:"pointer",
                fontFamily:'"JetBrains Mono", monospace',
                fontSize:11, letterSpacing:".06em", textTransform:"uppercase",
              }}
            >{isSignup ? "Sign in →" : "Create account →"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
