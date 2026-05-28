import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import AppShell from "../components/AppShell";
import TagEditor from "../components/TagEditor";
import { usePlayer } from "../hooks/usePlayer";
import { C, ACCENT, hexA, fmt, StatusPill } from "../theme";

const PAGE_SIZES = [25, 50, 100];

function Tile({ value, label, tone }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: 10,
      border: `1px solid ${C.borderS}`, background: C.panel,
    }}>
      <div style={{
        fontFamily: '"Instrument Serif", serif', fontSize: 26,
        color: tone || C.text, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        fontSize: 11, color: C.text2,
        fontFamily: '"JetBrains Mono", monospace',
        letterSpacing: ".06em", textTransform: "uppercase", marginTop: 3,
      }}>{label}</div>
    </div>
  );
}

function Check({ on, onClick }) {
  return (
    <span onClick={e => { e.stopPropagation(); onClick?.(); }} style={{
      width: 16, height: 16, borderRadius: 4, flexShrink: 0,
      border: `1.5px solid ${on ? ACCENT : C.border}`,
      background: on ? ACCENT : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 11, cursor: "pointer",
    }}>{on ? "✓" : ""}</span>
  );
}

function Confidence({ value }) {
  if (!value) return <span style={{ color: C.text3, fontFamily: '"JetBrains Mono", monospace', fontSize: 11 }}>—</span>;
  const pct = Math.round(value * 100);
  const tone = value >= 0.95 ? C.good : value >= 0.85 ? C.warn : C.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        flex: 1, height: 5, borderRadius: 99, background: C.bg2,
        overflow: "hidden", maxWidth: 56,
      }}>
        <div style={{ height: "100%", width: pct + "%", background: tone }} />
      </div>
      <span style={{
        fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
        color: C.text2, letterSpacing: ".04em",
      }}>{pct}%</span>
    </div>
  );
}

export default function FileManager() {
  const { playTrack } = usePlayer();
  const [searchParams] = useSearchParams();
  const initialStatus = searchParams.get("mb_status") || "";

  const [data, setData] = useState({ total: 0, items: [], pages: 1, page: 1 });
  const [params, setParams] = useState({
    page: 1, page_size: 50, sort_by: "filename", sort_dir: "asc",
    search: "", mb_status: initialStatus, source_id: "",
  });
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [editFileId, setEditFileId] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const searchTimer = useRef();

  const load = useCallback(async (p = params) => {
    setLoading(true);
    try {
      const res = await api.getFiles(p);
      setData(res);
      setSelected(new Set());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    api.getSources().then(setSources);
    load();
  }, []);

  const update = (patch) => {
    const next = { ...params, ...patch, page: patch.page ?? 1 };
    setParams(next);
    load(next);
  };

  const handleSearch = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => update({ search: val }), 350);
  };

  const toggleSelect = (id) => setSelected(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => {
    if (selected.size === data.items.length) setSelected(new Set());
    else setSelected(new Set(data.items.map(f => f.id)));
  };

  const handleBatch = async (action) => {
    if (!selected.size) return;
    setBatchLoading(true);
    try {
      const res = await api.batchAction([...selected], action);
      alert(`Done: ${res.success} succeeded, ${res.failed} failed`);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBatchLoading(false);
    }
  };

  const handlePlay = (f) => {
    playTrack({
      id: f.id,
      filename: f.filename,
      streamUrl: api.streamUrl(f.id),
      tags: { title: f.current_title, artist: f.current_artist, album: f.current_album },
    });
  };

  const allSelected = data.items.length > 0 && selected.size === data.items.length;
  const someSelected = selected.size > 0;

  // Filter tabs
  const FILTERS = [
    { key: "",         label: "All",     count: data.total },
    { key: "matched",  label: "Review",  count: null },
    { key: "applied",  label: "Clean",   count: null },
    { key: "unmatched",label: "Missing", count: null },
  ];

  const headerRight = (
    <div style={{ display: "flex", gap: 8 }}>
      <button onClick={() => load()} style={{
        appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
        color: C.text2, padding: "8px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
      }}>↺ Refresh</button>
    </div>
  );

  return (
    <AppShell title="Files"
      subtitle="Review scanned files and confirm or edit their ID3 tags."
      headerRight={headerRight}>
      <div style={{
        display: "flex", flexDirection: "column", height: "100%",
        padding: "18px 28px", gap: 14,
      }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Filter tabs */}
          <div style={{
            display: "flex", gap: 3, background: C.panel,
            border: `1px solid ${C.borderS}`, borderRadius: 9, padding: 3,
          }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => update({ mb_status: f.key })} style={{
                appearance: "none", border: "none", padding: "6px 11px", borderRadius: 6,
                background: params.mb_status === f.key ? C.bg2 : "transparent",
                color: params.mb_status === f.key ? C.text : C.text2,
                fontSize: 12, cursor: "pointer",
                fontWeight: params.mb_status === f.key ? 600 : 500,
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: ".04em", textTransform: "uppercase",
              }}>{f.label}{f.count != null ? ` · ${fmt(f.count)}` : ""}</button>
            ))}
          </div>

          {/* Search */}
          <input
            defaultValue={params.search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search filename, artist, album…"
            style={{
              appearance: "none", border: `1px solid ${C.border}`, background: C.bg2,
              color: C.text, padding: "8px 12px", borderRadius: 8, fontSize: 13,
              fontFamily: "inherit", outline: "none", minWidth: 240, flex: 1,
            }}
          />

          {/* Source filter */}
          {sources.length > 0 && (
            <select value={params.source_id} onChange={e => update({ source_id: e.target.value })}
              style={{
                appearance: "none", border: `1px solid ${C.border}`, background: C.bg2,
                color: C.text, padding: "8px 12px", borderRadius: 8, fontSize: 13,
                fontFamily: "inherit", outline: "none",
              }}>
              <option value="">All sources</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}

          {/* Page size */}
          <select value={params.page_size} onChange={e => update({ page_size: Number(e.target.value) })}
            style={{
              appearance: "none", border: `1px solid ${C.border}`, background: C.bg2,
              color: C.text, padding: "8px 10px", borderRadius: 8, fontSize: 12,
              fontFamily: "inherit", outline: "none", width: 70,
            }}>
            {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {/* Batch bar */}
        {someSelected && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", background: hexA(ACCENT, .08),
            border: `1px solid ${hexA(ACCENT, .3)}`, borderRadius: 9,
          }}>
            <span style={{ color: C.text, fontSize: 13, fontWeight: 500 }}>
              {selected.size} selected
            </span>
            <button onClick={() => handleBatch("apply")} disabled={batchLoading} style={{
              appearance: "none", border: "none", background: ACCENT, color: "#fff",
              padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>Apply All</button>
            <button onClick={() => handleBatch("skip")} disabled={batchLoading} style={{
              appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
              color: C.text2, padding: "6px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer",
            }}>Skip</button>
            <button onClick={() => handleBatch("reset_mb")} disabled={batchLoading} style={{
              appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
              color: C.text2, padding: "6px 12px", borderRadius: 7, fontSize: 12, cursor: "pointer",
            }}>Reset MB</button>
          </div>
        )}

        {/* Table */}
        <div style={{
          border: `1px solid ${C.borderS}`, borderRadius: 12,
          overflow: "hidden", background: C.panel, flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
        }}>
          {/* Header */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "36px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 100px 80px 80px",
            gap: 10, padding: "10px 14px", background: C.bg2,
            borderBottom: `1px solid ${C.borderS}`,
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
            color: C.text3, letterSpacing: ".06em", textTransform: "uppercase",
            flexShrink: 0,
          }}>
            <Check on={allSelected} onClick={toggleAll} />
            <span>Filename</span>
            <span>Current tags</span>
            <span>Proposed</span>
            <span>Confidence</span>
            <span>Status</span>
            <span>Actions</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading && !data.items.length ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "40px 14px", color: C.text3, fontSize: 13,
              }}>Loading…</div>
            ) : data.items.length === 0 ? (
              <div style={{
                padding: "40px 14px", textAlign: "center", color: C.text3, fontSize: 13,
              }}>No files match the current filter. Scan a source to populate your library.</div>
            ) : data.items.map((f, i) => (
              <div key={f.id} onDoubleClick={() => setEditFileId(f.id)} style={{
                display: "grid",
                gridTemplateColumns: "36px minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr) 100px 80px 80px",
                gap: 10, padding: "11px 14px", alignItems: "center",
                borderBottom: i < data.items.length - 1 ? `1px solid ${C.borderS}` : "none",
                background: selected.has(f.id) ? hexA(ACCENT, .05) : "transparent",
                cursor: "default", fontSize: 12.5,
              }}>
                <Check on={selected.has(f.id)} onClick={() => toggleSelect(f.id)} />

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    fontFamily: '"JetBrains Mono", monospace', fontSize: 11.5,
                    color: C.text2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }} title={f.path}>{f.filename}</div>
                  <div style={{
                    fontSize: 11, color: C.text3, marginTop: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.path?.split("/").slice(0, -1).join("/")}</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{
                    color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.current_title || <i style={{ color: C.text3 }}>no title</i>}</div>
                  <div style={{
                    fontSize: 11, color: C.text2, overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{f.current_artist || ""}</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  {f.proposed_title ? (
                    <>
                      <div style={{
                        color: C.good, fontWeight: 600,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{f.proposed_title}</div>
                      {f.proposed_confidence && (
                        <div style={{ fontSize: 11, color: C.text3 }}>
                          {Math.round(f.proposed_confidence * 100)}% match
                        </div>
                      )}
                    </>
                  ) : <span style={{ color: C.text3 }}>—</span>}
                </div>

                <Confidence value={f.proposed_confidence} />

                <StatusPill status={f.mb_status} small />

                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => handlePlay(f)} title="Play" style={{
                    appearance: "none", background: "transparent", border: "none",
                    color: C.text3, cursor: "pointer", padding: "4px 6px", borderRadius: 5,
                    fontSize: 14,
                  }}>▶</button>
                  <button onClick={() => setEditFileId(f.id)} title="Edit tags" style={{
                    appearance: "none", background: "transparent", border: "none",
                    color: C.text3, cursor: "pointer", padding: "4px 6px", borderRadius: 5,
                    fontSize: 12,
                  }}>✏</button>
                  {f.mb_status === "matched" && (
                    <button onClick={async () => { await api.applyTags(f.id); load(); }}
                      title="Apply tags" style={{
                        appearance: "none", background: "transparent", border: "none",
                        color: C.good, cursor: "pointer", padding: "4px 6px", borderRadius: 5,
                        fontSize: 13,
                      }}>✓</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <span style={{
            color: C.text2, fontFamily: '"JetBrains Mono", monospace',
            fontSize: 11, letterSpacing: ".04em",
          }}>
            {fmt(data.total)} FILES · PAGE {data.page} OF {data.pages}
            {loading && " · loading…"}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => update({ page: params.page - 1 })}
              disabled={params.page <= 1} style={{
                appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
                color: params.page <= 1 ? C.text3 : C.text2,
                padding: "7px 12px", borderRadius: 7, fontSize: 12, cursor: params.page <= 1 ? "not-allowed" : "pointer",
              }}>← Prev</button>
            {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
              let p;
              if (data.pages <= 5) p = i + 1;
              else if (params.page <= 3) p = i + 1;
              else if (params.page >= data.pages - 2) p = data.pages - 4 + i;
              else p = params.page - 2 + i;
              return (
                <button key={p} onClick={() => update({ page: p })} style={{
                  appearance: "none",
                  border: `1px solid ${params.page === p ? ACCENT : C.border}`,
                  background: params.page === p ? hexA(ACCENT, .12) : "transparent",
                  color: params.page === p ? C.text : C.text2,
                  padding: "7px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", minWidth: 36,
                }}>{p}</button>
              );
            })}
            <button onClick={() => update({ page: params.page + 1 })}
              disabled={params.page >= data.pages} style={{
                appearance: "none", border: `1px solid ${C.border}`, background: "transparent",
                color: params.page >= data.pages ? C.text3 : C.text2,
                padding: "7px 12px", borderRadius: 7, fontSize: 12,
                cursor: params.page >= data.pages ? "not-allowed" : "pointer",
              }}>Next →</button>
          </div>
        </div>
      </div>

      {editFileId && (
        <TagEditor fileId={editFileId} onClose={() => setEditFileId(null)} onApplied={load} />
      )}
    </AppShell>
  );
}
