import { useState, useEffect } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import { C, ACCENT, hexA, fmt, timeAgo, StatusPill } from "../theme";

export default function History() {
  const [sources, setSources] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const srcs = await api.getSources();
      setSources(srcs);
      const allJobs = [];
      for (const src of srcs) {
        const j = await api.getJobs(src.id, 20);
        allJobs.push(...j.map(job => ({ ...job, source_name: src.name, source_id: src.id })));
      }
      allJobs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setJobs(allJobs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const shown = filterSource === "all"
    ? jobs
    : jobs.filter(j => j.source_id === filterSource);

  const headerRight = (
    <button onClick={load} style={{
      appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
      color: C.text2, padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
    }}>↺ Refresh</button>
  );

  return (
    <AppShell title="History"
      subtitle="Every scan job — what was found and processed."
      headerRight={headerRight}>
      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Filter by source */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{
            display: "flex", gap: 3, background: C.panel,
            border: `1px solid ${C.borderS}`, borderRadius: 9, padding: 3,
          }}>
            <button onClick={() => setFilterSource("all")} style={{
              appearance: "none", border: "none", padding: "6px 11px", borderRadius: 6,
              background: filterSource === "all" ? C.bg2 : "transparent",
              color: filterSource === "all" ? C.text : C.text2,
              fontSize: 12, cursor: "pointer",
              fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em", textTransform: "uppercase",
            }}>All sources</button>
            {sources.map(s => (
              <button key={s.id} onClick={() => setFilterSource(s.id)} style={{
                appearance: "none", border: "none", padding: "6px 11px", borderRadius: 6,
                background: filterSource === s.id ? C.bg2 : "transparent",
                color: filterSource === s.id ? C.text : C.text2,
                fontSize: 12, cursor: "pointer",
                fontFamily: '"JetBrains Mono", monospace', letterSpacing: ".04em", textTransform: "uppercase",
              }}>{s.name}</button>
            ))}
          </div>
          <span style={{
            marginLeft: "auto", color: C.text3,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase",
          }}>{shown.length} events</span>
        </div>

        {/* Table */}
        <div style={{
          border: `1px solid ${C.borderS}`, borderRadius: 12,
          background: C.panel, overflowX: "auto",
        }}>
          <div style={{ minWidth: 620 }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "110px minmax(120px,1fr) 100px 80px 80px 80px",
              gap: 12, padding: "10px 14px", background: C.bg2,
              borderBottom: `1px solid ${C.borderS}`,
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: C.text3, letterSpacing: ".06em", textTransform: "uppercase",
            }}>
              <span>When</span>
              <span>Source</span>
              <span>Files found</span>
              <span>Matched</span>
              <span>Applied</span>
              <span>Status</span>
            </div>

            {loading ? (
              <div style={{
                padding: "30px 14px", textAlign: "center", color: C.text3, fontSize: 13,
              }}>Loading…</div>
            ) : shown.length === 0 ? (
              <div style={{
                padding: "30px 14px", textAlign: "center", color: C.text3, fontSize: 13,
              }}>No scan jobs yet. Add a source and run a scan.</div>
            ) : shown.map((j, i) => (
              <div key={j.id} style={{
                display: "grid",
                gridTemplateColumns: "110px minmax(120px,1fr) 100px 80px 80px 80px",
                gap: 12, alignItems: "center",
                padding: "12px 14px",
                borderBottom: i < shown.length - 1 ? `1px solid ${C.borderS}` : "none",
                fontSize: 12.5,
              }}>
                <span style={{
                  color: C.text2, fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 11, letterSpacing: ".04em",
                }}>{timeAgo(j.created_at)}</span>

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: C.text, fontWeight: 500,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{j.source_name}</div>
                  {j.error_message && (
                    <div style={{
                      fontSize: 11, color: C.danger, marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }} title={j.error_message}>{j.error_message}</div>
                  )}
                </div>

                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
                  color: C.text,
                }}>{fmt(j.files_found || 0)}</span>

                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
                  color: C.warn,
                }}>{fmt(j.files_matched || 0)}</span>

                <span style={{
                  fontFamily: '"JetBrains Mono", monospace', fontSize: 12,
                  color: C.good,
                }}>{fmt(j.files_applied || 0)}</span>

                <StatusPill status={j.status} small />
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {!loading && shown.length > 0 && (
          <div style={{
            display: "flex", gap: 20, padding: "14px 18px",
            background: C.panel, border: `1px solid ${C.borderS}`, borderRadius: 10,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5, color: C.text2,
          }}>
            <span>
              <span style={{ color: C.text, fontWeight: 600 }}>
                {fmt(shown.reduce((s, j) => s + (j.files_found || 0), 0))}
              </span> files found
            </span>
            <span>
              <span style={{ color: C.warn, fontWeight: 600 }}>
                {fmt(shown.reduce((s, j) => s + (j.files_matched || 0), 0))}
              </span> matched
            </span>
            <span>
              <span style={{ color: C.good, fontWeight: 600 }}>
                {fmt(shown.filter(j => j.status === "completed").length)}
              </span> completed jobs
            </span>
            <span>
              <span style={{ color: C.danger, fontWeight: 600 }}>
                {fmt(shown.filter(j => j.status === "failed").length)}
              </span> failed
            </span>
          </div>
        )}
      </div>
    </AppShell>
  );
}
