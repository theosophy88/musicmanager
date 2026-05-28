import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
import { C, ACCENT, hexA, fmt, timeAgo } from "../theme";

function BigStat({ value, label, tone, sub, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: "16px 18px", background: C.panel, border: `1px solid ${C.borderS}`,
      borderRadius: 12, cursor: onClick ? "pointer" : "default",
      display: "flex", flexDirection: "column", gap: 4, minHeight: 104,
    }}>
      <div style={{
        fontFamily: '"Instrument Serif", serif', fontSize: 36,
        lineHeight: 1, color: tone, letterSpacing: "-0.01em",
      }}>{value}</div>
      <div style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
        color: C.text3, letterSpacing: ".06em", textTransform: "uppercase", marginTop: 2,
      }}>{sub}</div>}
    </div>
  );
}

function Legend({ dot, label }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
      letterSpacing: ".04em", textTransform: "uppercase",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot }} />
      {label}
    </span>
  );
}

function Card({ title, subtitle, actionLabel, onAction, children }) {
  return (
    <div style={{
      padding: "16px 18px", background: C.panel,
      border: `1px solid ${C.borderS}`, borderRadius: 12,
    }}>
      <div style={{
        display: "flex", alignItems: "baseline", justifyContent: "space-between",
        gap: 10, marginBottom: 6,
      }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11.5, color: C.text2, marginTop: 2 }}>{subtitle}</div>}
        </div>
        {actionLabel && (
          <button onClick={onAction} style={{
            appearance: "none", background: "transparent", border: "none",
            color: ACCENT, fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", cursor: "pointer",
          }}>{actionLabel}</button>
        )}
      </div>
      {children}
    </div>
  );
}

function ScanChart({ days }) {
  const max = Math.max(...days.map(d => d.scanned), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 120, paddingTop: 8 }}>
      {days.map((d, i) => {
        const h1 = (d.scanned / max) * 100;
        const h2 = d.scanned > 0 ? (Math.min(d.confirmed, d.scanned) / max) * 100 : 0;
        return (
          <div key={i} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "stretch", gap: 4, height: "100%",
          }}>
            <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%", height: `${Math.max(h1, 2)}%`,
                background: hexA(ACCENT, .22), borderRadius: "3px 3px 0 0",
                position: "relative",
              }}>
                {h2 > 0 && <div style={{
                  position: "absolute", left: 0, right: 0, bottom: 0,
                  height: `${(h2 / Math.max(h1, 0.01)) * 100}%`,
                  background: ACCENT, borderRadius: "3px 3px 0 0",
                }} />}
              </div>
            </div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 9, color: C.text3,
              textAlign: "center", letterSpacing: ".04em",
            }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [sources, setSources] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, srcs] = await Promise.all([api.getStats(), api.getSources()]);
      setStats(s);
      setSources(srcs);
      const allJobs = [];
      for (const src of srcs.slice(0, 3)) {
        const j = await api.getJobs(src.id, 10);
        allJobs.push(...j.map(job => ({ ...job, source_name: src.name })));
      }
      allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setJobs(allJobs.slice(0, 20));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const hasRunning = jobs.some(j => j.status === "running" || j.status === "pending");
    if (!hasRunning) return;
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, [jobs]);

  const total   = stats?.total_files ?? 0;
  const clean   = stats?.applied ?? 0;
  const review  = stats?.matched ?? 0;
  const missing = (stats?.unmatched ?? 0) + (stats?.errors ?? 0);
  const pct = total ? Math.round((clean / total) * 100) : 0;

  const scanDays = useMemo(() => {
    const out = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayJobs = jobs.filter(j => {
        const jd = new Date(j.created_at);
        return jd.getDate() === d.getDate() &&
               jd.getMonth() === d.getMonth() &&
               jd.getFullYear() === d.getFullYear();
      });
      out.push({
        label: i === 0 ? "today" : i === 7 ? "7d" : i === 13 ? "13d" : "",
        scanned:   dayJobs.reduce((s, j) => s + (j.files_found || 0), 0),
        confirmed: dayJobs.reduce((s, j) => s + (j.files_matched || 0), 0),
      });
    }
    return out;
  }, [jobs]);

  const recent = jobs.slice(0, 5);

  const headerRight = (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={load} style={{
        appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
        color: C.text2, padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
      }}>↺ Refresh</button>
      {sources.length > 0 && (
        <button onClick={async () => {
          for (const s of sources) { try { await api.scanSource(s.id); } catch (_) {} }
          setTimeout(load, 1000);
        }} style={{
          appearance: "none", border: "none", background: ACCENT, color: "#fff",
          padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>⚡ Scan All</button>
      )}
    </div>
  );

  return (
    <AppShell title="Dashboard" subtitle="Status of your music library." headerRight={headerRight}>
      {loading ? (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "100%", color: C.text3, fontSize: 14,
        }}>Loading…</div>
      ) : (
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Big stat row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <BigStat value={fmt(total)} label="Files scanned" tone={C.text}
              sub={`across ${sources.length} source${sources.length !== 1 ? "s" : ""}`} />
            <BigStat value={fmt(clean)} label="Tags clean" tone={C.good}
              sub={`${pct}% of library`} />
            <BigStat value={fmt(review)} label="Needs review" tone={C.warn}
              sub="suggested by MusicBrainz"
              onClick={() => nav("/files?mb_status=matched")} />
            <BigStat value={fmt(missing)} label="Missing tags" tone={C.danger}
              sub="no match found"
              onClick={() => nav("/files?mb_status=unmatched")} />
          </div>

          {/* Library health bar */}
          <div style={{
            padding: "16px 18px", background: C.panel,
            border: `1px solid ${C.borderS}`, borderRadius: 12,
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>Library health</div>
              <div style={{
                fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                color: C.text2, letterSpacing: ".06em",
              }}>{pct}% TAGGED CLEAN</div>
            </div>
            <div style={{
              height: 8, borderRadius: 99, background: C.bg2,
              overflow: "hidden", display: "flex",
            }}>
              <div style={{ flex: clean, background: C.good }} />
              <div style={{ flex: review, background: C.warn }} />
              <div style={{ flex: Math.max(missing, total - clean - review), background: C.danger }} />
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: C.text2 }}>
              <Legend dot={C.good}   label={`${fmt(clean)} clean`} />
              <Legend dot={C.warn}   label={`${fmt(review)} review`} />
              <Legend dot={C.danger} label={`${fmt(missing)} missing`} />
            </div>
          </div>

          {/* Lower grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
            <Card title="Scan activity · last 14 days" subtitle="files processed per day">
              <ScanChart days={scanDays} />
            </Card>
            <Card title="Sources" subtitle={`${sources.length} connected`}
              actionLabel="Manage →" onAction={() => nav("/sources")}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {sources.map(s => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: C.bg2,
                    border: `1px solid ${C.borderS}`, borderRadius: 8,
                  }}>
                    <span style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: s.is_active ? C.good : C.text3, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: 13, color: C.text }}>{s.name}</span>
                    <span style={{
                      fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
                      color: C.text3, letterSpacing: ".04em",
                    }}>{fmt(s.file_count || 0)} files</span>
                  </div>
                ))}
                {sources.length === 0 && (
                  <button onClick={() => nav("/sources")} style={{
                    padding: "10px 12px", border: `1px dashed ${C.border}`,
                    background: "transparent", color: C.text2,
                    borderRadius: 8, fontSize: 12.5, cursor: "pointer",
                  }}>+ Connect your first cloud source</button>
                )}
              </div>
            </Card>
          </div>

          {/* Recent activity */}
          <Card title="Recent activity" subtitle="last scan jobs"
            actionLabel="See history →" onAction={() => nav("/history")}>
            <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
              {recent.length === 0 && (
                <div style={{ color: C.text3, fontSize: 13, padding: "10px 0" }}>
                  No scan jobs yet.
                </div>
              )}
              {recent.map((j, i) => (
                <div key={j.id} style={{
                  display: "grid", gridTemplateColumns: "110px 1fr 120px", gap: 14,
                  alignItems: "center", padding: "10px 0",
                  borderTop: i ? `1px solid ${C.hairline}` : "none", fontSize: 13,
                }}>
                  <span style={{
                    color: C.text3, fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 11, letterSpacing: ".04em",
                  }}>{timeAgo(j.created_at)}</span>
                  <span style={{
                    color: C.text, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <b style={{ fontWeight: 600 }}>{fmt(j.files_found || 0)} files found</b>
                    <span style={{ color: C.text2 }}> · {fmt(j.files_matched || 0)} matched</span>
                  </span>
                  <span style={{ color: C.text2, fontSize: 12, textAlign: "right" }}>
                    {j.source_name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
