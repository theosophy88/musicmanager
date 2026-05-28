import { useState, useEffect } from "react";
import { ChevronRight, X, Check } from "lucide-react";
import api from "../api";
import AppShell from "../components/AppShell";
import { C, ACCENT, hexA, inputSty } from "../theme";

// ─── Folder browser (keep existing logic, apply new styling) ──────
function FolderBrowser({ sourceId, selectedPaths, onToggle, onClose }) {
  const [path, setPath] = useState("/");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stack, setStack] = useState(["/"]);

  const browse = async (p) => {
    setLoading(true);
    try {
      const res = await api.browseSource(sourceId, p);
      setEntries(res.entries.filter(e => e.is_dir));
      setPath(p);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { browse("/"); }, []);

  const navigate = (entry) => {
    setStack(s => [...s, entry.path]);
    browse(entry.path);
  };
  const goBack = () => {
    if (stack.length <= 1) return;
    const prev = stack[stack.length - 2];
    setStack(s => s.slice(0, -1));
    browse(prev);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16,
    }}>
      <div style={{
        background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16,
        width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,.6)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 18px", borderBottom: `1px solid ${C.hairline}`,
        }}>
          <span style={{ fontWeight: 600, color: C.text, fontSize: 14.5 }}>Select folders to scan</span>
          <button onClick={onClose} style={{
            appearance: "none", background: "transparent", border: `1px solid ${C.border}`,
            color: C.text2, borderRadius: 7, padding: "4px 8px", fontSize: 12, cursor: "pointer",
          }}>×</button>
        </div>

        {/* Breadcrumb */}
        <div style={{
          padding: "8px 18px", borderBottom: `1px solid ${C.hairline}`,
          display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center",
          fontFamily: '"JetBrains Mono", monospace', fontSize: 11, color: C.text3,
        }}>
          {stack.map((p, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ opacity: .5 }}>›</span>}
              <button onClick={() => { setStack(s => s.slice(0, i + 1)); browse(p); }}
                style={{
                  appearance: "none", background: "transparent", border: "none",
                  color: C.text2, cursor: "pointer", fontFamily: "inherit", fontSize: "inherit",
                }}>
                {p === "/" ? "Root" : p.split("/").filter(Boolean).pop()}
              </button>
            </span>
          ))}
        </div>

        <div style={{ height: 280, overflowY: "auto", padding: "6px 10px" }}>
          {loading ? (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", color: C.text3, fontSize: 13,
            }}>Loading…</div>
          ) : entries.length === 0 ? (
            <div style={{
              textAlign: "center", color: C.text3, fontSize: 13, paddingTop: 32,
            }}>No subdirectories found</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {stack.length > 1 && (
                <button onClick={goBack} style={{
                  appearance: "none", background: "transparent", border: "none",
                  color: C.text2, cursor: "pointer", padding: "8px 10px", borderRadius: 7,
                  display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "inherit",
                }}>📁 ..</button>
              )}
              {entries.map(e => {
                const isSel = selectedPaths.includes(e.path);
                return (
                  <div key={e.path} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => onToggle(e.path)} style={{
                      flex: 1, appearance: "none", textAlign: "left",
                      border: `1px solid ${isSel ? ACCENT : "transparent"}`,
                      background: isSel ? hexA(ACCENT, .08) : "transparent",
                      color: C.text, cursor: "pointer", padding: "8px 10px", borderRadius: 7,
                      display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "inherit",
                    }}>
                      {isSel
                        ? <span style={{ color: ACCENT, fontSize: 12 }}>✓</span>
                        : <span style={{ color: C.text3, fontSize: 12 }}>📁</span>
                      }
                      {e.name}
                    </button>
                    <button onClick={() => navigate(e)} style={{
                      appearance: "none", background: "transparent", border: "none",
                      color: C.text3, cursor: "pointer", padding: "8px",
                    }}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          padding: "14px 18px", borderTop: `1px solid ${C.hairline}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ color: C.text2, fontSize: 12.5 }}>
            {selectedPaths.length} folder{selectedPaths.length !== 1 ? "s" : ""} selected
          </span>
          <button onClick={onClose} style={{
            appearance: "none", border: "none", background: ACCENT, color: "#fff",
            padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Done</button>
        </div>
      </div>
    </div>
  );
}

// ─── Provider config fields ────────────────────────────────────────
const PROVIDER_FIELDS = {
  nextcloud: [
    { key: "url",        label: "Nextcloud URL",  placeholder: "https://nextcloud.example.com", type: "url" },
    { key: "username",   label: "Username",        placeholder: "your_username" },
    { key: "password",   label: "App Password",    placeholder: "xxxx-xxxx-xxxx-xxxx", type: "password" },
    { key: "verify_ssl", label: "Verify SSL",      type: "checkbox" },
  ],
  s3: [
    { key: "bucket",     label: "Bucket name" },
    { key: "region",     label: "Region",          placeholder: "us-east-1" },
    { key: "access_key", label: "Access Key ID" },
    { key: "secret_key", label: "Secret Access Key", type: "password" },
    { key: "prefix",     label: "Prefix (optional)", placeholder: "music/" },
  ],
};

function FieldLabel({ label }) {
  return (
    <span style={{
      fontSize: 10.5, fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: ".08em", textTransform: "uppercase", color: C.text2, display: "block", marginBottom: 5,
    }}>{label}</span>
  );
}

// ─── Source form ───────────────────────────────────────────────────
function SourceForm({ existing, onSave, onCancel }) {
  const [name, setName]           = useState(existing?.name || "");
  const [type, setType]           = useState(existing?.provider_type || "nextcloud");
  const [config, setConfig]       = useState(existing?.config || { verify_ssl: true });
  const [scanPaths, setScanPaths] = useState(existing?.scan_paths || []);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [tempSourceId, setTempSourceId] = useState(existing?.id || null);

  const handleTest = async () => {
    if (!tempSourceId) { alert("Save the source first, then test."); return; }
    setTesting(true); setTestResult(null);
    try {
      const res = await api.testSource(tempSourceId);
      setTestResult(res);
    } catch (e) {
      setTestResult({ success: false, message: e.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      let src;
      if (existing) {
        src = await api.updateSource(existing.id, { name, config, scan_paths: scanPaths });
      } else {
        src = await api.createSource({ name, provider_type: type, config, scan_paths: scanPaths });
        setTempSourceId(src.id);
      }
      onSave(src);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = PROVIDER_FIELDS[type] || [];

  return (
    <div style={{
      padding: "18px 20px", background: C.panel, border: `1px solid ${C.border}`,
      borderRadius: 12, display: "flex", flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>
        {existing ? "Edit source" : "New source"}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: existing ? "1fr" : "1fr 1fr", gap: 12 }}>
        <div>
          <FieldLabel label="Name" />
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="My Nextcloud" style={inputSty} />
        </div>
        {!existing && (
          <div>
            <FieldLabel label="Provider" />
            <select value={type} onChange={e => setType(e.target.value)} style={inputSty}>
              <option value="nextcloud">Nextcloud (WebDAV)</option>
              <option value="s3">Amazon S3</option>
            </select>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {fields.map(f => (
          f.type === "checkbox" ? (
            <label key={f.key} style={{
              display: "flex", alignItems: "center", gap: 8,
              color: C.text2, fontSize: 13, cursor: "pointer",
            }}>
              <input type="checkbox" checked={!!config[f.key]}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.checked }))}
                style={{ accentColor: ACCENT }} />
              {f.label}
            </label>
          ) : (
            <div key={f.key}>
              <FieldLabel label={f.label} />
              <input type={f.type || "text"} value={config[f.key] || ""}
                onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                placeholder={f.placeholder} style={inputSty} />
            </div>
          )
        ))}
      </div>

      {/* Scan paths */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <FieldLabel label="Scan folders" />
          <button onClick={() => setShowBrowser(true)} disabled={!tempSourceId}
            style={{
              appearance: "none", background: "transparent", border: `1px solid ${C.border}`,
              color: tempSourceId ? C.text2 : C.text3, borderRadius: 6,
              padding: "4px 10px", fontSize: 11.5, cursor: tempSourceId ? "pointer" : "not-allowed",
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".06em",
            }}>Browse</button>
        </div>
        {scanPaths.length === 0 ? (
          <div style={{
            color: C.text3, fontSize: 12.5, fontStyle: "italic",
            fontFamily: '"JetBrains Mono", monospace',
          }}>No folders — entire storage will be scanned</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {scanPaths.map(p => (
              <div key={p} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
                background: C.bg2, border: `1px solid ${C.borderS}`, borderRadius: 7,
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: C.text2,
              }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p}</span>
                <button onClick={() => setScanPaths(ps => ps.filter(x => x !== p))} style={{
                  appearance: "none", background: "transparent", border: "none",
                  color: C.text3, cursor: "pointer", padding: 2,
                }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {testResult && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, fontSize: 12.5,
          color: testResult.success ? C.good : C.danger,
          background: hexA(testResult.success ? C.good : C.danger, .10),
          border: `1px solid ${hexA(testResult.success ? C.good : C.danger, .35)}`,
        }}>{testResult.message}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {tempSourceId && (
            <button onClick={handleTest} disabled={testing} style={{
              appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
              color: C.text2, padding: "9px 14px", borderRadius: 8,
              fontSize: 13, cursor: "pointer", opacity: testing ? .6 : 1,
            }}>{testing ? "Testing…" : "Test connection"}</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{
            appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
            color: C.text2, padding: "9px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{
            appearance: "none", border: "none", background: ACCENT, color: "#fff",
            padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", opacity: saving ? .65 : 1,
          }}>{saving ? "Saving…" : "Save source"}</button>
        </div>
      </div>

      {showBrowser && tempSourceId && (
        <FolderBrowser
          sourceId={tempSourceId}
          selectedPaths={scanPaths}
          onToggle={p => setScanPaths(ps =>
            ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]
          )}
          onClose={() => {
            setShowBrowser(false);
            api.updateSource(tempSourceId, { scan_paths: scanPaths }).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export default function Sources() {
  const [sources, setSources] = useState([]);
  const [editing, setEditing] = useState(null);
  const [scanning, setScanning] = useState({});

  useEffect(() => { api.getSources().then(setSources).catch(console.error); }, []);

  const reload = () => api.getSources().then(setSources).catch(console.error);

  const handleScan = async (id) => {
    setScanning(s => ({ ...s, [id]: true }));
    try {
      await api.scanSource(id);
    } catch (e) {
      alert(e.message);
    } finally {
      setScanning(s => ({ ...s, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this source and all its file records?")) return;
    await api.deleteSource(id);
    setSources(s => s.filter(x => x.id !== id));
  };

  const headerRight = !editing && (
    <button onClick={() => setEditing("new")} style={{
      appearance: "none", border: "none", background: ACCENT, color: "#fff",
      padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
    }}>+ Add source</button>
  );

  return (
    <AppShell title="Sources"
      subtitle="Cloud folders MusicManager can read and tag."
      headerRight={headerRight}>
      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {editing === "new" && (
          <SourceForm onSave={() => { reload(); setEditing(null); }}
            onCancel={() => setEditing(null)} />
        )}

        {sources.length === 0 && !editing ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", padding: "60px 28px", gap: 16,
          }}>
            {/* vinyl-style empty state */}
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: `radial-gradient(circle at center, ${ACCENT} 0 8%, ${C.bg2} 8.2% 10%, transparent 10.2%),
                repeating-radial-gradient(circle at center, ${C.borderS} 0 1px, transparent 1px 4px), ${C.panel}`,
              border: `1px solid ${C.border}`, opacity: .7,
            }} />
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: '"Instrument Serif", serif', fontSize: 22,
                color: C.text, marginBottom: 4,
              }}>No sources yet</div>
              <div style={{ color: C.text2, fontSize: 13.5 }}>
                Connect a cloud folder to start scanning &amp; cleaning ID3 tags.
              </div>
            </div>
            <button onClick={() => setEditing("new")} style={{
              appearance: "none", border: "none", background: ACCENT, color: "#fff",
              padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>+ Add your first source</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sources.map(s =>
              editing?.id === s.id ? (
                <SourceForm key={s.id} existing={s}
                  onSave={() => { reload(); setEditing(null); }}
                  onCancel={() => setEditing(null)} />
              ) : (
                <div key={s.id} style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                  background: C.panel, border: `1px solid ${C.borderS}`, borderRadius: 12,
                }}>
                  {/* Provider icon placeholder */}
                  <span style={{
                    width: 44, height: 44, borderRadius: 10, background: C.bg2,
                    border: `1px solid ${C.borderS}`,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                  }}>☁️</span>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: C.text }}>{s.name}</div>
                    <div style={{
                      fontSize: 11.5, color: C.text2,
                      fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em", marginTop: 2,
                    }}>
                      <span style={{ color: s.is_active ? C.good : C.text3 }}>
                        {s.is_active ? "● connected" : "● inactive"}
                      </span>
                      {" · "}{s.provider_type}
                      {s.file_count != null && ` · ${s.file_count.toLocaleString()} files`}
                      {s.last_scan_at && ` · scanned ${new Date(s.last_scan_at).toLocaleDateString()}`}
                    </div>
                  </div>

                  <button onClick={() => setEditing(s)} style={{
                    appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
                    color: C.text2, padding: "7px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  }}>Manage</button>
                  <button onClick={() => handleScan(s.id)} disabled={scanning[s.id]} style={{
                    appearance: "none", border: "none", background: ACCENT, color: "#fff",
                    padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", opacity: scanning[s.id] ? .6 : 1,
                  }}>{scanning[s.id] ? "Starting…" : "Scan"}</button>
                  <button onClick={() => handleDelete(s.id)} style={{
                    appearance: "none", background: "transparent", border: "none",
                    color: C.text3, padding: "7px 8px", fontSize: 12, cursor: "pointer",
                    fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".06em", textTransform: "uppercase",
                  }}>disconnect</button>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
