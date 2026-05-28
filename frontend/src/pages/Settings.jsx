import { useState } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import { useAuth } from "../hooks/useAuth";
import { C, ACCENT, hexA, inputSty } from "../theme";

const SCHEDULE_OPTIONS = [
  { value: 0,   label: "Manual only"   },
  { value: 1,   label: "Every hour"    },
  { value: 6,   label: "Every 6 hours" },
  { value: 12,  label: "Every 12 hours"},
  { value: 24,  label: "Daily"         },
  { value: 48,  label: "Every 2 days"  },
  { value: 168, label: "Weekly"        },
];

function Section({ title, children }) {
  return (
    <div style={{
      padding: "18px 20px", background: C.panel,
      border: `1px solid ${C.borderS}`, borderRadius: 12,
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
      <span style={{ color: C.text2, fontSize: 13, width: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ color: C.text, fontSize: 13 }}>{children}</span>
    </div>
  );
}

export default function Settings() {
  const { user, setUser } = useAuth();
  const [schedule, setSchedule] = useState(user?.scan_schedule_hours ?? 0);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSchedule(schedule);
      setUser(updated);
      setMsg({ ok: true, text: "Schedule saved!" });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  return (
    <AppShell title="Settings" subtitle="Account preferences and scan schedule.">
      <div style={{ padding: "22px 28px", maxWidth: 560, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Account */}
        <Section title="Your account">
          <Row label="Username">{user?.username}</Row>
          <Row label="Email">{user?.email || "—"}</Row>
          <Row label="Role">
            {user?.is_admin
              ? <span style={{ color: ACCENT }}>Admin</span>
              : <span style={{ color: C.text2 }}>User</span>
            }
          </Row>
        </Section>

        {/* Scan schedule */}
        <Section title="Background scan schedule">
          <div style={{ color: C.text2, fontSize: 13 }}>
            Automatically re-scan your sources to discover new files and update metadata.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select value={schedule} onChange={e => setSchedule(Number(e.target.value))}
              style={{ ...inputSty, width: 200 }}>
              {SCHEDULE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button onClick={handleSave} disabled={saving} style={{
              appearance: "none", border: "none", background: ACCENT, color: "#fff",
              padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: "pointer", opacity: saving ? .65 : 1,
            }}>{saving ? "Saving…" : "Save"}</button>
            {msg && (
              <span style={{
                fontSize: 12.5,
                color: msg.ok ? C.good : C.danger,
              }}>{msg.text}</span>
            )}
          </div>
        </Section>

        {/* About */}
        <div style={{
          padding: "14px 18px", background: C.panel,
          border: `1px solid ${C.borderS}`, borderRadius: 10,
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
          color: C.text3, lineHeight: 1.8,
        }}>
          <div style={{ color: C.text2, fontWeight: 600, marginBottom: 4 }}>MusicManager v1.0</div>
          <div>Metadata via MusicBrainz (free, open database)</div>
          <div>Tag reading/writing: mutagen · Storage: WebDAV (Nextcloud) · DB: SQLite</div>
          <div>Future providers: Amazon S3, OneDrive, Google Drive</div>
        </div>
      </div>
    </AppShell>
  );
}
