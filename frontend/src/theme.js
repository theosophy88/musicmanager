export const ACCENT = "#ff6a3d";

export const C = {
  bg:       "#0e0d10",
  bg2:      "#15131a",
  panel:    "rgba(255,255,255,0.04)",
  border:   "rgba(255,255,255,0.10)",
  borderS:  "rgba(255,255,255,0.06)",
  text:     "#f1ecdf",
  text2:    "rgba(241,236,223,0.62)",
  text3:    "rgba(241,236,223,0.38)",
  accentInk:"#fff",
  good:     "#5ee0a1",
  warn:     "#ffc15e",
  danger:   "#ff7766",
  hairline: "rgba(255,255,255,0.06)",
};

export function hexA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function fmt(n) { return (n ?? 0).toLocaleString(); }

export function timeAgo(ts) {
  const d = Math.round((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return d + "s ago";
  if (d < 3600) return Math.round(d / 60) + "m ago";
  if (d < 86400) return Math.round(d / 3600) + "h ago";
  return Math.round(d / 86400) + "d ago";
}

export const inputSty = {
  appearance: "none",
  border: `1px solid ${C.border}`,
  background: C.bg2,
  color: C.text,
  padding: "10px 12px",
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  transition: "border-color .15s",
  width: "100%",
  boxSizing: "border-box",
};

export function StatusPill({ status, small }) {
  const map = {
    matched:   { txt: "matched",   tone: C.good   },
    confirmed: { txt: "confirmed", tone: C.good   },
    applied:   { txt: "applied",   tone: C.good   },
    review:    { txt: "review",    tone: C.warn   },
    missing:   { txt: "missing",   tone: C.danger },
    unmatched: { txt: "unmatched", tone: C.danger },
    error:     { txt: "error",     tone: C.danger },
    skipped:   { txt: "skipped",   tone: C.text3  },
    reverted:  { txt: "reverted",  tone: C.text3  },
    pending:   { txt: "pending",   tone: C.warn   },
    running:   { txt: "running",   tone: C.warn   },
    completed: { txt: "completed", tone: C.good   },
    failed:    { txt: "failed",    tone: C.danger },
    inactive:  { txt: "inactive",  tone: C.text3  },
    active:    { txt: "active",    tone: C.good   },
  }[status] || { txt: status || "—", tone: C.text3 };
  return (
    <span style={{
      display: "inline-block",
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 99,
      fontSize: small ? 9.5 : 10.5,
      fontFamily: '"JetBrains Mono", monospace',
      letterSpacing: ".08em",
      textTransform: "uppercase",
      color: map.tone,
      background: hexA(map.tone, .14),
      border: `1px solid ${hexA(map.tone, .35)}`,
    }}>{map.txt}</span>
  );
}
