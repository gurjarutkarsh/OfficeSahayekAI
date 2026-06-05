import { useState, useEffect } from "react";
import axios from "axios";

import { API } from "../config";
export default function ImageLibrary({ type, onSelect, label }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/library/images`, { params: { type } });
      setImages(res.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { if (open) fetchImages(); }, [open]);

  const handleSave = async (file) => {
    if (!file) return;
    setSaving(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const mimeType = file.type || "image/png";
      try {
        await axios.post(`${API}/library/save-image`, {
          name: file.name,
          type,
          data: base64,
          mime_type: mimeType,
        });
        fetchImages();
      } catch { alert("Failed to save image."); }
      setSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this saved image?")) return;
    await axios.delete(`${API}/library/images/${id}`);
    fetchImages();
  };

  const handleSelect = (img) => {
    // Convert base64 back to a blob URL
    const byteChars = atob(img.data);
    const byteArr = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob = new Blob([byteArr], { type: img.mime_type });
    const url = URL.createObjectURL(blob);
    onSelect(url, img.name);
    setOpen(false);
  };

  return (
    <div style={{ marginTop: "0.5rem" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: "none", border: "1px solid #DDE3EE", borderRadius: 6,
          padding: "0.3rem 0.75rem", fontSize: "0.8rem", cursor: "pointer",
          color: "#2D4A70", fontWeight: 600,
        }}
      >
        📁 {open ? "Hide" : `My Saved ${label}s`}
      </button>

      {open && (
        <div style={{
          marginTop: "0.5rem", background: "#F4F6FB", border: "1px solid #DDE3EE",
          borderRadius: 8, padding: "0.75rem",
        }}>
          {/* Save new */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", cursor: "pointer" }}>
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => handleSave(e.target.files[0])} />
            <span style={{
              background: "#1B2E4E", color: "#fff", borderRadius: 6,
              padding: "0.3rem 0.75rem", fontSize: "0.78rem", fontWeight: 600,
            }}>
              {saving ? "Saving…" : `+ Save Current ${label}`}
            </span>
            <span style={{ fontSize: "0.75rem", color: "#718096" }}>Upload to save to library</span>
          </label>

          {loading && <p style={{ fontSize: "0.82rem", color: "#718096" }}>Loading…</p>}

          {!loading && images.length === 0 && (
            <p style={{ fontSize: "0.82rem", color: "#718096" }}>No saved {label.toLowerCase()}s yet.</p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem" }}>
            {images.map(img => (
              <div key={img.id} style={{
                background: "#fff", border: "1px solid #DDE3EE", borderRadius: 6,
                overflow: "hidden", cursor: "pointer", position: "relative",
              }}>
                <img
                  src={`data:${img.mime_type};base64,${img.data}`}
                  alt={img.name}
                  onClick={() => handleSelect(img)}
                  style={{ width: "100%", height: 70, objectFit: "contain", padding: 4 }}
                />
                <div style={{ padding: "0.2rem 0.4rem", borderTop: "1px solid #DDE3EE" }}>
                  <p style={{ fontSize: "0.68rem", color: "#4A5568", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{img.name}</p>
                  <button onClick={() => handleDelete(img.id)}
                    style={{ fontSize: "0.65rem", color: "#C0392B", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}