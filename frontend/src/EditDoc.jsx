import { useState } from "react";
import { Link } from "react-router-dom";
import Letterhead from "./tools/Letterhead.jsx";
import SignatureInserter from "./tools/SignatureInserter.jsx";
import DocConverter from "./tools/DocConverter.jsx";
import EditDocTool from "./tools/EditDocTool.jsx";
import "./tools/tools.css";

const TOOLS = [
  { id: "letterhead", label: "Letterhead", emoji: "🏢" },
  { id: "signature",  label: "Signature",  emoji: "✍️" },
  { id: "pdftoword",  label: "Converter",  emoji: "🔄" },
  { id: "editdoc",    label: "Edit Doc",   emoji: "✏️" },
];

export default function EditDoc({ user, onLogout }) {
  const [activeTool, setActiveTool] = useState("letterhead");

  return (
    <div className="editdoc-container">
      <header className="editdoc-header">
        <div className="editdoc-header-inner">
          <div className="editdoc-logo">
            <span className="logo-badge">OS</span>
            <div>
              <h1 className="logo-title">OfficeSahayek AI</h1>
              <p className="logo-sub">Document Tools</p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
            <Link to="/" className="back-btn">← Back to Analyzer</Link>
            {user && (
              <>
                <span style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.6)" }}>{user.name}</span>
                <button onClick={onLogout}
                  style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
                    color:"rgba(255,255,255,0.85)", borderRadius:6, padding:"0.2rem 0.6rem",
                    fontSize:"0.75rem", cursor:"pointer" }}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="editdoc-main">
        <div className="tool-tabs">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`tool-tab ${activeTool === tool.id ? "active" : ""}`}
              onClick={() => setActiveTool(tool.id)}
            >
              <span className="tool-tab-emoji">{tool.emoji}</span>
              <span className="tool-tab-label">{tool.label}</span>
            </button>
          ))}
        </div>

        <div className="tool-panel">
          {activeTool === "letterhead" && <Letterhead />}
          {activeTool === "signature"  && <SignatureInserter />}
          {activeTool === "pdftoword"  && <DocConverter />}
          {activeTool === "editdoc"    && <EditDocTool />}
        </div>
      </main>

      <footer className="editdoc-footer">
        OfficeSahayek AI · Document Tools
      </footer>
    </div>
  );
}