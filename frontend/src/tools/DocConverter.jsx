import { useState } from "react";
import axios from "axios";
import { API } from "../config";

const TABS = [
  { id: "img2pdf",  label: "Image → PDF",  emoji: "🖼️" },
  { id: "pdf2word", label: "PDF → Word",   emoji: "📝" },
  { id: "word2pdf", label: "Word → PDF",   emoji: "📄" },
];

export default function DocConverter() {
  const [activeTab, setActiveTab] = useState("img2pdf");

  return (
    <div>
      <h2 className="tool-title">🔄 Document Converter</h2>
      <p className="tool-subtitle">Convert between PDF, Word, and image formats.</p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: "0.45rem 1.1rem", borderRadius: 8, fontSize: "0.88rem", fontWeight: 600,
              border: "1px solid #DDE3EE", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem",
              background: activeTab === t.id ? "#1B2E4E" : "#fff",
              color: activeTab === t.id ? "#fff" : "#4A5568",
            }}
          >{t.emoji} {t.label}</button>
        ))}
      </div>

      {activeTab === "img2pdf"  && <ImagesToPdf />}
      {activeTab === "pdf2word" && <PdfToWord />}
      {activeTab === "word2pdf" && <WordToPdf />}
    </div>
  );
}


// ── Image → PDF ───────────────────────────────────────────
function ImagesToPdf() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
    setError("");
    setSuccess(false);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setError("");
    setSuccess(false);
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    try {
      const res = await axios.post(`${API}/convert/images-to-pdf`, formData, {
        responseType: "blob"
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "converted.pdf";
      link.click();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Conversion failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="field-group" style={{ marginBottom: "1rem" }}>
        <label className="field-label">Select Images (JPG, PNG — select multiple)</label>
        <label className="upload-zone" style={{ cursor: "pointer" }}>
          <input type="file" accept=".jpg,.jpeg,.png" multiple onChange={handleFiles} style={{ display: "none" }} />
          {files.length > 0 ? (
            <div>
              <div className="upload-zone-icon">🖼️</div>
              <div className="upload-zone-filename">{files.length} image{files.length > 1 ? "s" : ""} selected</div>
              <div className="upload-zone-hint">{files.map(f => f.name).join(", ")}</div>
              <div className="upload-zone-hint" style={{ marginTop: 4 }}>Click to change</div>
            </div>
          ) : (
            <>
              <div className="upload-zone-icon">🖼️</div>
              <div className="upload-zone-text">Click to select images</div>
              <div className="upload-zone-hint">JPG, PNG supported · Select multiple for multi-page PDF</div>
            </>
          )}
        </label>
      </div>

      {files.length > 1 && (
        <div style={{ background: "#EDF1F7", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.82rem", color: "#2D4A70" }}>
          📋 Images will be added in order: {files.map((f, i) => `${i+1}. ${f.name}`).join(" · ")}
        </div>
      )}

      {error   && <div className="tool-error">⚠️ {error}</div>}
      {success && <div className="tool-success">✅ PDF downloaded successfully!</div>}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button className="btn-primary" onClick={handleConvert} disabled={loading || !files.length}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Converting…</> : "⬇ Convert & Download PDF"}
        </button>
        {files.length > 0 && <button className="btn-secondary" onClick={() => { setFiles([]); setSuccess(false); setError(""); }}>Clear</button>}
      </div>
    </div>
  );
}


// ── PDF → Word ────────────────────────────────────────────
function PdfToWord() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess(false);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/convert/pdf-to-word`, formData, {
        responseType: "blob"
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(".pdf", ".docx");
      link.click();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Conversion failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="field-group" style={{ marginBottom: "1rem" }}>
        <label className="field-label">Select PDF File</label>
        <label className="upload-zone" style={{ cursor: "pointer" }}>
          <input type="file" accept=".pdf" onChange={e => { setFile(e.target.files[0]); setError(""); setSuccess(false); }} style={{ display: "none" }} />
          {file
            ? <><div className="upload-zone-icon">📄</div><div className="upload-zone-filename">{file.name}</div><div className="upload-zone-hint">Click to change</div></>
            : <><div className="upload-zone-icon">📄</div><div className="upload-zone-text">Click to select PDF</div><div className="upload-zone-hint">Will be converted to editable .docx</div></>}
        </label>
      </div>

      {error   && <div className="tool-error">⚠️ {error}</div>}
      {success && <div className="tool-success">✅ Word file downloaded successfully!</div>}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button className="btn-primary" onClick={handleConvert} disabled={loading || !file}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Converting…</> : "⬇ Convert & Download Word"}
        </button>
        {file && <button className="btn-secondary" onClick={() => { setFile(null); setSuccess(false); setError(""); }}>Clear</button>}
      </div>
    </div>
  );
}


// ── Word → PDF ────────────────────────────────────────────
function WordToPdf() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess(false);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/convert/word-to-pdf`, formData, {
        responseType: "blob"
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(".docx", ".pdf");
      link.click();
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Conversion failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="field-group" style={{ marginBottom: "1rem" }}>
        <label className="field-label">Select Word File (.docx)</label>
        <label className="upload-zone" style={{ cursor: "pointer" }}>
          <input type="file" accept=".docx" onChange={e => { setFile(e.target.files[0]); setError(""); setSuccess(false); }} style={{ display: "none" }} />
          {file
            ? <><div className="upload-zone-icon">📝</div><div className="upload-zone-filename">{file.name}</div><div className="upload-zone-hint">Click to change</div></>
            : <><div className="upload-zone-icon">📝</div><div className="upload-zone-text">Click to select Word file</div><div className="upload-zone-hint">.docx format only · requires LibreOffice installed</div></>}
        </label>
      </div>

      {error   && <div className="tool-error">⚠️ {error}</div>}
      {success && <div className="tool-success">✅ PDF downloaded successfully!</div>}

      <div className="btn-row" style={{ marginTop: "1rem" }}>
        <button className="btn-primary" onClick={handleConvert} disabled={loading || !file}>
          {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Converting…</> : "⬇ Convert & Download PDF"}
        </button>
        {file && <button className="btn-secondary" onClick={() => { setFile(null); setSuccess(false); setError(""); }}>Clear</button>}
      </div>
    </div>
  );
}