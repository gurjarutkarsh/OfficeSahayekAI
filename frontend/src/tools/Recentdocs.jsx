import { useState, useEffect } from "react";
import axios from "axios";

import { API } from "../config.jsx";
export default function RecentDocs({ onSelect }) {
  const [docs, setDocs] = useState([]);
  const [open, setOpen] = useState(false);

  const fetchDocs = async () => {
    try {
      const res = await axios.get(`${API}/library/recent`);
      setDocs(res.data);
    } catch { }
  };

  useEffect(() => { if (open) fetchDocs(); }, [open]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await axios.delete(`${API}/library/recent/${id}`);
    fetchDocs();
  };

  const formatDate = (str) => {
    const d = new Date(str);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "1px solid #DDE3EE", borderRadius: 6,
          padding: "0.35rem 0.9rem", fontSize: "0.82rem", cursor: "pointer",
          color: "#2D4A70", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem",
        }}
      >
        🕒 {open ? "Hide" : "Recent Documents"}
      </button>

      {open && (
        <div style={{
          marginTop: "0.5rem", background: "#F4F6FB", border: "1px solid #DDE3EE",
          borderRadius: 10, padding: "0.75rem",
        }}>
          {docs.length === 0 && (
            <p style={{ fontSize: "0.82rem", color: "#718096" }}>No recent documents yet.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {docs.map(doc => (
              <div key={doc.id}
                onClick={() => { onSelect(doc); setOpen(false); }}
                style={{
                  background: "#fff", border: "1px solid #DDE3EE", borderRadius: 8,
                  padding: "0.6rem 0.85rem", cursor: "pointer", display: "flex",
                  alignItems: "center", justifyContent: "space-between",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#EDF1F7"}
                onMouseLeave={e => e.currentTarget.style.background = "#fff"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
                  <span style={{ fontSize: "1.1rem" }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1B2E4E",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 300 }}>
                      {doc.filename}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "#718096" }}>{formatDate(doc.created_at)}</p>
                  </div>
                </div>
                <button onClick={e => handleDelete(doc.id, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: "0.8rem", flexShrink: 0 }}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}