import { useState, useEffect, useMemo } from "react";
import api from "../api";
import AppShell from "../components/AppShell";
import { C, ACCENT, hexA } from "../theme";

const MODES = [
  { id: "folders", label: "Folders" },
  { id: "albums",  label: "Albums"  },
  { id: "artists", label: "Artists" },
  { id: "genres",  label: "Genres"  },
  { id: "years",   label: "Years"   },
];

// ─── Album art (procedural gradient) ──────────────────────────────
function AlbumArt({ seed }) {
  const hue = (seed * 47) % 360;
  return (
    <div style={{
      aspectRatio: "1", borderRadius: 10, position: "relative", overflow: "hidden",
      background: `linear-gradient(135deg, hsl(${hue}, 50%, 35%) 0%, hsl(${(hue+60)%360}, 30%, 20%) 100%)`,
      boxShadow: `0 8px 24px rgba(0,0,0,.35), inset 0 0 0 1px ${C.borderS}`,
    }}>
      <div style={{
        position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
        width: "58%", aspectRatio: "1", borderRadius: "50%",
        background: `radial-gradient(circle at center, ${ACCENT} 0 8%, rgba(0,0,0,0) 8.2% 9%, transparent 9.2%),
          repeating-radial-gradient(circle at center, rgba(255,255,255,.05) 0 1px, transparent 1px 4px), #0a0a0c`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,.06)`,
      }} />
    </div>
  );
}

// ─── Artist portrait (procedural circular) ─────────────────────────
function ArtistPortrait({ name }) {
  const seed = name.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  const hue = (seed * 37) % 360;
  const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      aspectRatio: "1", borderRadius: "50%", overflow: "hidden",
      background: `radial-gradient(circle at 30% 28%, hsl(${hue},55%,65%) 0%, hsl(${(hue+30)%360},40%,35%) 45%, hsl(${(hue+60)%360},20%,15%) 100%)`,
      boxShadow: `0 10px 28px rgba(0,0,0,.4), inset 0 0 0 1px ${C.borderS}`,
      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
    }}>
      <div style={{
        position: "absolute", left: "20%", top: "15%", width: "50%", aspectRatio: "1",
        borderRadius: "50%",
        background: "radial-gradient(circle at center, rgba(255,255,255,.28) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <span style={{
        fontFamily: '"Instrument Serif", serif', fontSize: "36%",
        color: "rgba(255,255,255,.92)", letterSpacing: "0.02em",
        textShadow: "0 2px 10px rgba(0,0,0,.4)", position: "relative", zIndex: 1,
      }}>{initials}</span>
    </div>
  );
}

// ─── Folder icon ───────────────────────────────────────────────────
function FolderIcon() {
  return (
    <svg width={15} height={12} viewBox="0 0 28 22" style={{ flex: "0 0 auto" }}>
      <path d="M2 4.5C2 3.4 2.9 2.5 4 2.5h7l2 2.5h11c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2z"
        fill="transparent" stroke={C.text2} strokeWidth="1.4" />
    </svg>
  );
}

// ─── Folder tree ───────────────────────────────────────────────────
function FoldersMode({ files }) {
  const tree = useMemo(() => {
    const root = { name: "/", children: {}, files: [], path: "" };
    for (const f of files) {
      const parts = (f.path || f.filename || "").split("/").filter(Boolean);
      let n = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const seg = parts[i];
        if (!n.children[seg]) n.children[seg] = { name: seg, children: {}, files: [], path: n.path + "/" + seg };
        n = n.children[seg];
      }
      n.files.push(f);
    }
    return root;
  }, [files]);

  const [openSet, setOpenSet] = useState(new Set());
  const toggle = (p) => setOpenSet(s => { const n = new Set(s); n.has(p) ? n.delete(p) : n.add(p); return n; });

  function Node({ node, depth }) {
    const kids = Object.values(node.children);
    const open = openSet.has(node.path) || depth === 0;
    if (depth === 0) return <div>{kids.map(k => <Node key={k.path} node={k} depth={1} />)}</div>;
    return (
      <div>
        <div onClick={() => toggle(node.path)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 8px", paddingLeft: 8 + depth * 16,
          cursor: "pointer", borderRadius: 6,
        }}>
          <span style={{
            color: C.text3, fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10, width: 10,
          }}>{(kids.length || node.files.length) ? (open ? "▾" : "▸") : "·"}</span>
          <FolderIcon />
          <span style={{ fontSize: 13, color: C.text }}>{node.name}</span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
            color: C.text3, letterSpacing: ".04em", marginLeft: 4,
          }}>{node.files.length || ""}</span>
        </div>
        {open && (
          <div>
            {kids.map(k => <Node key={k.path} node={k} depth={depth + 1} />)}
            {node.files.map(f => (
              <div key={f.id} style={{
                display: "grid", gridTemplateColumns: "1fr auto",
                gap: 14, alignItems: "center",
                padding: "6px 8px", paddingLeft: 8 + (depth + 1) * 16,
                fontSize: 12.5,
              }}>
                <span style={{
                  color: C.text, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  <span style={{ color: C.text3, marginRight: 8, fontFamily: '"JetBrains Mono", monospace', fontSize: 10 }}>♪</span>
                  {f.filename}
                </span>
                <span style={{ color: C.text2, fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5 }}>
                  {f.current_artist || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: C.panel, border: `1px solid ${C.borderS}`,
      borderRadius: 12, padding: "10px 6px", overflow: "auto", maxHeight: 520,
    }}>
      {Object.values(tree.children).length === 0 && tree.files.length === 0
        ? <div style={{ color: C.text3, padding: "20px 14px", fontSize: 13 }}>No files scanned yet.</div>
        : <Node node={tree} depth={0} />
      }
    </div>
  );
}

// ─── Albums grid ───────────────────────────────────────────────────
function AlbumsMode({ files }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const f of files) {
      const k = (f.current_album || "Unknown album") + "::" + (f.current_artist || "—");
      if (!m.has(k)) m.set(k, { album: f.current_album || "Unknown album", artist: f.current_artist || "—", files: [] });
      m.get(k).files.push(f);
    }
    return [...m.values()].sort((a, b) => a.album.localeCompare(b.album));
  }, [files]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
      {groups.map((g, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AlbumArt seed={(g.album + g.artist).length + i} />
          <div>
            <div style={{
              fontSize: 13.5, color: C.text, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{g.album}</div>
            <div style={{
              fontSize: 12, color: C.text2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{g.artist}</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: C.text3, letterSpacing: ".06em", marginTop: 2,
            }}>{g.files.length} TRACK{g.files.length !== 1 ? "S" : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Artists grid ──────────────────────────────────────────────────
function ArtistsMode({ files }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const f of files) {
      const k = f.current_artist || "Unknown";
      if (!m.has(k)) m.set(k, { artist: k, count: 0, albums: new Set(), genres: new Set() });
      const g = m.get(k);
      g.count++;
      if (f.current_album) g.albums.add(f.current_album);
      if (f.current_genre) g.genres.add(f.current_genre);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [files]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 14 }}>
      {groups.map(g => (
        <div key={g.artist} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ArtistPortrait name={g.artist} />
          <div>
            <div style={{
              fontSize: 13.5, color: C.text, fontWeight: 600,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{g.artist}</div>
            <div style={{
              fontFamily: '"JetBrains Mono", monospace', fontSize: 10.5,
              color: C.text3, letterSpacing: ".06em", marginTop: 2, textTransform: "uppercase",
            }}>{g.count} track{g.count !== 1 ? "s" : ""} · {g.albums.size} album{g.albums.size !== 1 ? "s" : ""}</div>
            {g.genres.size > 0 && (
              <div style={{
                fontSize: 11.5, color: C.text2, marginTop: 3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{[...g.genres].join(" · ")}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Chips mode (genres / years) ──────────────────────────────────
function ChipsMode({ files, field }) {
  const groups = useMemo(() => {
    const m = new Map();
    for (const f of files) {
      const k = f[field] || "—";
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [files, field]);

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {groups.map(([k, n]) => (
        <div key={String(k)} style={{
          padding: "10px 14px", borderRadius: 99, background: C.panel,
          border: `1px solid ${C.borderS}`,
          display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: C.text,
        }}>
          <span>{k}</span>
          <span style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            color: C.text3, letterSpacing: ".04em",
          }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────
export default function Library() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("folders");

  useEffect(() => {
    api.getFiles({ page: 1, page_size: 1000 })
      .then(res => setFiles(res.items || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Library"
      subtitle="Browse your files by folder, album, artist, genre or year.">
      <div style={{ padding: "22px 28px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Mode tabs + file count */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{
            display: "flex", gap: 3, background: C.panel,
            border: `1px solid ${C.borderS}`, borderRadius: 10, padding: 4,
          }}>
            {MODES.map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                appearance: "none", border: "none", padding: "7px 12px", borderRadius: 7,
                background: mode === m.id ? C.bg2 : "transparent",
                color: mode === m.id ? C.text : C.text2,
                fontSize: 12.5, cursor: "pointer",
                fontWeight: mode === m.id ? 600 : 500,
                boxShadow: mode === m.id ? `0 1px 0 ${C.hairline}` : "none",
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{
            fontFamily: '"JetBrains Mono", monospace', fontSize: 11,
            color: C.text3, letterSpacing: ".06em", textTransform: "uppercase",
          }}>
            {loading ? "loading…" : `${files.length} files`}
          </div>
        </div>

        {loading ? (
          <div style={{ color: C.text3, fontSize: 13, padding: "20px 0" }}>Loading library…</div>
        ) : (
          <>
            {mode === "folders" && <FoldersMode files={files} />}
            {mode === "albums"  && <AlbumsMode files={files} />}
            {mode === "artists" && <ArtistsMode files={files} />}
            {mode === "genres"  && <ChipsMode files={files} field="current_genre" />}
            {mode === "years"   && <ChipsMode files={files} field="current_year"  />}
          </>
        )}
      </div>
    </AppShell>
  );
}
