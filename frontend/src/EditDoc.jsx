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
  { id: "pdftoword",  label: "Converter", emoji: "🔄" },
  { id: "editdoc",    label: "Edit Doc",   emoji: "✏️" },
];

export default function EditDoc() {
  const [activeTool, setActiveTool] = useState("letterhead");

  return (
    <div className="editdoc-container">
      <header className="editdoc-header">
        <div className="editdoc-header-inner">
          <div className="editdoc-logo">
            <span className="logo-badge">OS</span>
            <div>
              <h1 className="logo-title">Indravir AI</h1>
              <p className="logo-sub">Document Tools</p>
            </div>
          </div>
          <Link to="/" className="back-btn">← Back to Analyzer</Link>
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
        Officesahayek AI · Document Tools
      </footer>
    </div>
  );
}