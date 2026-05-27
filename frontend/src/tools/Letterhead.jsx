import { useState, useRef } from "react";

export default function Letterhead() {
  const [logo, setLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [form, setForm] = useState({
    companyName: "",
    tagline: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    bodyText: "",
  });
  const previewRef = useRef(null);

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDownload = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${form.companyName || "Letterhead"}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; }
          .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; }
          .header {
            background: #1B2E4E;
            padding: 28px 40px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .header-left { display: flex; align-items: center; gap: 16px; }
          .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 6px; }
          .company-name { color: #fff; font-size: 22px; font-weight: 700; }
          .tagline { color: rgba(255,255,255,0.65); font-size: 12px; margin-top: 3px; }
          .header-right { text-align: right; }
          .contact-line { color: rgba(255,255,255,0.75); font-size: 11px; margin-top: 3px; }
          .accent-bar { height: 4px; background: #E07B39; }
          .body { padding: 40px; min-height: 200mm; }
          .body-text { font-size: 13px; line-height: 1.8; color: #333; white-space: pre-wrap; }
          .footer {
            border-top: 2px solid #E07B39;
            padding: 14px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-text { font-size: 10px; color: #718096; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="header-left">
              ${logoPreview ? `<img src="${logoPreview}" class="logo" />` : ""}
              <div>
                <div class="company-name">${form.companyName || "Company Name"}</div>
                ${form.tagline ? `<div class="tagline">${form.tagline}</div>` : ""}
              </div>
            </div>
            <div class="header-right">
              ${form.phone   ? `<div class="contact-line">📞 ${form.phone}</div>` : ""}
              ${form.email   ? `<div class="contact-line">✉ ${form.email}</div>` : ""}
              ${form.website ? `<div class="contact-line">🌐 ${form.website}</div>` : ""}
              ${form.address ? `<div class="contact-line">📍 ${form.address}</div>` : ""}
            </div>
          </div>
          <div class="accent-bar"></div>
          <div class="body">
            <p class="body-text">${form.bodyText || ""}</p>
          </div>
          <div class="footer">
            <span class="footer-text">${form.companyName || ""}</span>
            <span class="footer-text">${form.address || ""}</span>
            <span class="footer-text">${form.email || ""}</span>
          </div>
        </div>
        <script>window.onload = () => { window.print(); }<\/script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div>
      <h2 className="tool-title">🏢 Letterhead Generator</h2>
      <p className="tool-subtitle">Fill in your details, preview, and download as PDF.</p>

      <div className="tool-section">
        {/* Logo Upload */}
        <div className="field-group">
          <label className="field-label">Company Logo</label>
          <label className="upload-zone" style={{ cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={handleLogo} style={{ display: "none" }} />
            {logoPreview ? (
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <img src={logoPreview} alt="logo" style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 6 }} />
                <span className="upload-zone-filename">Logo uploaded — click to change</span>
              </div>
            ) : (
              <>
                <div className="upload-zone-icon">🖼️</div>
                <div className="upload-zone-text">Click to upload logo</div>
                <div className="upload-zone-hint">PNG, JPG, SVG supported</div>
              </>
            )}
          </label>
        </div>

        {/* Company Info */}
        <div className="tool-row">
          <div className="field-group">
            <label className="field-label">Company Name *</label>
            <input className="field-input" name="companyName" value={form.companyName} onChange={handleChange} placeholder="e.g. Indravir Enterprises" />
          </div>
          <div className="field-group">
            <label className="field-label">Tagline</label>
            <input className="field-input" name="tagline" value={form.tagline} onChange={handleChange} placeholder="e.g. Building Trust Since 2001" />
          </div>
        </div>

        <div className="tool-row">
          <div className="field-group">
            <label className="field-label">Phone</label>
            <input className="field-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
          </div>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" name="email" value={form.email} onChange={handleChange} placeholder="info@company.com" />
          </div>
        </div>

        <div className="tool-row">
          <div className="field-group">
            <label className="field-label">Website</label>
            <input className="field-input" name="website" value={form.website} onChange={handleChange} placeholder="www.company.com" />
          </div>
          <div className="field-group">
            <label className="field-label">Address</label>
            <input className="field-input" name="address" value={form.address} onChange={handleChange} placeholder="123 Main St, City, State" />
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">Letter Body (optional)</label>
          <textarea className="field-textarea" name="bodyText" value={form.bodyText} onChange={handleChange} placeholder="Type your letter content here..." rows={5} />
        </div>
      </div>

      {/* Live Preview */}
      <div style={{ border: "1px solid #DDE3EE", borderRadius: 10, overflow: "hidden", marginBottom: "1.5rem" }}>
        <div style={{ background: "#718096", padding: "0.4rem 0.75rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600 }}>PREVIEW</span>
        </div>
        <div ref={previewRef} style={{ background: "#fff" }}>
          {/* Header */}
          <div style={{ background: "#1B2E4E", padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {logoPreview && <img src={logoPreview} alt="logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 4 }} />}
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: "1.1rem" }}>{form.companyName || "Company Name"}</div>
                {form.tagline && <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>{form.tagline}</div>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {form.phone   && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>📞 {form.phone}</div>}
              {form.email   && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>✉ {form.email}</div>}
              {form.website && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>🌐 {form.website}</div>}
              {form.address && <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>📍 {form.address}</div>}
            </div>
          </div>
          {/* Accent bar */}
          <div style={{ height: 4, background: "#E07B39" }} />
          {/* Body */}
          <div style={{ padding: "24px 28px", minHeight: 120 }}>
            <p style={{ fontSize: "0.88rem", lineHeight: 1.8, color: "#333", whiteSpace: "pre-wrap" }}>
              {form.bodyText || <span style={{ color: "#aaa" }}>Letter body will appear here…</span>}
            </p>
          </div>
          {/* Footer */}
          <div style={{ borderTop: "2px solid #E07B39", padding: "10px 28px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.72rem", color: "#718096" }}>{form.companyName}</span>
            <span style={{ fontSize: "0.72rem", color: "#718096" }}>{form.address}</span>
            <span style={{ fontSize: "0.72rem", color: "#718096" }}>{form.email}</span>
          </div>
        </div>
      </div>

      <div className="btn-row">
        <button className="btn-primary" onClick={handleDownload} disabled={!form.companyName}>
          ⬇ Download as PDF
        </button>
      </div>
      {!form.companyName && <p style={{ fontSize: "0.8rem", color: "#718096", marginTop: "0.5rem" }}>Enter a company name to enable download.</p>}
    </div>
  );
}