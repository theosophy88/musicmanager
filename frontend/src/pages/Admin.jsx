import { useState, useEffect } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { C, ACCENT, hexA, timeAgo, StatusPill, inputSty } from "../theme";

function FieldLabel({ label }) {
  return (
    <span style={{
      fontSize: 10.5, fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: ".08em", textTransform: "uppercase",
      color: C.text2, display: "block", marginBottom: 5,
    }}>{label}</span>
  );
}

function RolePill({ role }) {
  const tone = role === "Admin" ? ACCENT : role === "Editor" ? C.warn : C.text3;
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 99,
      fontSize: 10.5, fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: ".08em", textTransform: "uppercase",
      color: tone, background: hexA(tone, .14), border: `1px solid ${hexA(tone, .35)}`,
    }}>{role || "Viewer"}</span>
  );
}

export default function Admin() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ username: "", email: "", password: "", is_admin: false });
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newForm.username || !newForm.email || !newForm.password) return;
    setSaving(true);
    try {
      const created = await api.createUser(newForm);
      setUsers(u => [...u, created]);
      setNewForm({ username: "", email: "", password: "", is_admin: false });
      setShowNew(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAdmin = async (u) => {
    const updated = await api.updateUser(u.id, { is_admin: !u.is_admin });
    setUsers(us => us.map(x => x.id === u.id ? { ...x, is_admin: updated.is_admin } : x));
  };

  const handleToggleActive = async (u) => {
    const updated = await api.updateUser(u.id, { is_active: !u.is_active });
    setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: updated.is_active } : x));
  };

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"? All their data will be removed.`)) return;
    await api.deleteUser(u.id);
    setUsers(us => us.filter(x => x.id !== u.id));
  };

  if (!me?.is_admin) {
    return (
      <AppShell title="Admin" subtitle="User management requires admin access.">
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: "100%", gap: 12, color: C.text3, padding: 40,
        }}>
          <div style={{ fontSize: 32 }}>🔒</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, color: C.text }}>
            Admin access required
          </div>
          <div style={{ fontSize: 13.5, color: C.text2 }}>
            You need admin privileges to manage users.
          </div>
        </div>
      </AppShell>
    );
  }

  const activeCount  = users.filter(u => u.is_active !== false).length;
  const pendingCount = users.filter(u => u.is_active === false).length;

  const headerRight = (
    <button onClick={() => setShowNew(s => !s)} style={{
      appearance: "none", border: "none", background: ACCENT, color: "#fff",
      padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    }}>{showNew ? "× Cancel" : "+ Invite user"}</button>
  );

  return (
    <AppShell title="User management"
      subtitle="Create, activate, and manage who can use this workspace."
      headerRight={headerRight}>
      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Summary row */}
        <div style={{
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: C.text3, letterSpacing: ".06em", textTransform: "uppercase",
        }}>
          {users.length} users · {activeCount} active · {pendingCount} disabled
        </div>

        {/* New user form */}
        {showNew && (
          <div style={{
            padding: "16px 18px", background: C.panel,
            border: `1px dashed ${hexA(ACCENT, .5)}`, borderRadius: 12,
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end",
          }}>
            <div>
              <FieldLabel label="Username" />
              <input value={newForm.username}
                onChange={e => setNewForm(f => ({ ...f, username: e.target.value }))}
                placeholder="jess" style={inputSty} />
            </div>
            <div>
              <FieldLabel label="Email" />
              <input type="email" value={newForm.email}
                onChange={e => setNewForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jess@studio.fm" style={inputSty} />
            </div>
            <div>
              <FieldLabel label="Password" />
              <input type="password" value={newForm.password}
                onChange={e => setNewForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" style={inputSty} />
            </div>
            <button onClick={handleCreate} disabled={saving} style={{
              appearance: "none", border: "none", background: ACCENT, color: "#fff",
              padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", opacity: saving ? .65 : 1, height: 40, alignSelf: "end",
            }}>Send invite</button>
          </div>
        )}

        {/* Users table */}
        <div style={{
          border: `1px solid ${C.borderS}`, borderRadius: 12,
          background: C.panel, overflowX: "auto",
        }}>
          <div style={{ minWidth: 700 }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "40px minmax(160px,1.4fr) 100px 80px 110px minmax(160px,auto)",
              gap: 10, padding: "10px 14px", background: C.bg2,
              borderBottom: `1px solid ${C.borderS}`,
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: C.text3, letterSpacing: ".06em", textTransform: "uppercase",
            }}>
              <span />
              <span>User</span>
              <span>Role</span>
              <span>Status</span>
              <span>Last seen</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>

            {loading ? (
              <div style={{ padding: "30px 14px", textAlign: "center", color: C.text3, fontSize: 13 }}>
                Loading…
              </div>
            ) : users.length === 0 ? (
              <div style={{ padding: "30px 14px", textAlign: "center", color: C.text3, fontSize: 13 }}>
                No users found.
              </div>
            ) : users.map((u, i) => {
              const isMe = u.id === me?.id;
              const role = u.is_admin ? "Admin" : "Editor";
              const status = u.is_active !== false ? "active" : "inactive";
              const initials = (u.username || "?")[0].toUpperCase();

              return (
                <div key={u.id} style={{
                  display: "grid",
                  gridTemplateColumns: "40px minmax(160px,1.4fr) 100px 80px 110px minmax(160px,auto)",
                  gap: 10, alignItems: "center",
                  padding: "11px 14px",
                  borderBottom: i < users.length - 1 ? `1px solid ${C.borderS}` : "none",
                  fontSize: 13, opacity: status === "inactive" ? .55 : 1,
                }}>
                  <span style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: hexA(ACCENT, .18), color: ACCENT,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                  }}>{initials}</span>

                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      color: C.text, fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{u.username}</span>
                      {isMe && (
                        <span style={{
                          color: C.text3, fontSize: 10.5,
                          fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".06em",
                        }}>YOU</span>
                      )}
                    </div>
                    <div style={{
                      color: C.text2, fontSize: 11.5,
                      fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{u.email}</div>
                  </div>

                  <RolePill role={role} />

                  <StatusPill status={status} small />

                  <span style={{
                    color: C.text2, fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11, letterSpacing: ".04em",
                  }}>{u.last_login ? timeAgo(u.last_login) : "never"}</span>

                  {!isMe ? (
                    <div style={{
                      display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap",
                    }}>
                      <button onClick={() => handleToggleAdmin(u)} style={{
                        appearance: "none",
                        border: `1px solid ${C.border}`, background: "transparent",
                        color: C.text2, padding: "5px 10px", borderRadius: 6, fontSize: 11.5,
                        cursor: "pointer",
                        fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em",
                        textTransform: "uppercase",
                      }}>{u.is_admin ? "Demote" : "Make admin"}</button>
                      <button onClick={() => handleToggleActive(u)} style={{
                        appearance: "none", border: `1px solid ${C.border}`,
                        background: "transparent", padding: "5px 10px", borderRadius: 6,
                        fontSize: 11.5, cursor: "pointer",
                        fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em",
                        textTransform: "uppercase",
                        color: status === "active" ? C.danger : C.good,
                        borderColor: status === "active" ? hexA(C.danger, .35) : hexA(C.good, .35),
                      }}>{status === "active" ? "Deactivate" : "Activate"}</button>
                      <button onClick={() => handleDelete(u)} style={{
                        appearance: "none", background: "transparent", border: "none",
                        color: C.text3, cursor: "pointer", padding: "5px 6px",
                        fontSize: 14,
                      }} title="Delete user">✕</button>
                    </div>
                  ) : (
                    <div style={{ textAlign: "right" }}>
                      <span style={{
                        color: C.text3, fontSize: 11.5,
                        fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".06em",
                      }}>current session</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
