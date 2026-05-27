import { useState, useRef, useEffect } from "react";

export default function SignatureInserter() {
  const [pdfFile, setPdfFile] = useState(null);
  const [sigFile, setSigFile] = useState(null);
  const [sigPreview, setSigPreview] = useState(null);
  const [sigPos, setSigPos] = useState({ x: 100, y: 400 });
  const [sigSize, setSigSize] = useState({ w: 160, h: 60 });
  const [rotate, setRotate] = useState(0);
  const [removeBg, setRemoveBg] = useState(false);
  const [bgThreshold, setBgThreshold] = useState(200);
  const [opacity, setOpacity] = useState(100);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activePanel, setActivePanel] = useState("position");
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const sigImgRef = useRef(null);
  const processedSigRef = useRef(null);

  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      };
      document.head.appendChild(script);
    }
  }, []);

  const handlePdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPdfFile(file);
    const url = URL.createObjectURL(file);
    setSigPos({ x: 100, y: 400 });
    if (window.pdfjsLib) {
      const pdf = await window.pdfjsLib.getDocument(url).promise;
      pdfDocRef.current = pdf;
      setTotalPages(pdf.numPages);
      setPage(1);
      renderPage(pdf, 1);
    }
  };

  const handleSig = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSigFile(file);
    const url = URL.createObjectURL(file);
    setSigPreview(url);
    const img = new Image();
    img.onload = () => {
      sigImgRef.current = img;
      processSignature(img, removeBg, bgThreshold);
    };
    img.src = url;
  };

  const processSignature = (img, doRemoveBg, threshold) => {
    const offscreen = document.createElement("canvas");
    offscreen.width  = img.naturalWidth;
    offscreen.height = img.naturalHeight;
    const ctx = offscreen.getContext("2d");
    ctx.drawImage(img, 0, 0);

    if (doRemoveBg) {
      const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const brightness = (r + g + b) / 3;
        if (brightness > threshold) {
          // Light pixel = background, make transparent
          data[i+3] = 0;
        }
        // Dark pixels keep their original color — no forced black
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const processed = new Image();
    processed.onload = () => {
      processedSigRef.current = processed;
      renderCanvas();
    };
    processed.src = offscreen.toDataURL();
  };

  useEffect(() => {
    if (sigImgRef.current) processSignature(sigImgRef.current, removeBg, bgThreshold);
  }, [removeBg, bgThreshold]);

  const renderPage = async (pdf, pageNum) => {
    const pdfPage = await pdf.getPage(pageNum);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = pdfPage.getViewport({ scale: 1.8 });
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    if (processedSigRef.current) drawSignature(ctx);
  };

  const renderCanvas = async () => {
    if (!pdfDocRef.current) return;
    await renderPage(pdfDocRef.current, page);
  };

  const drawSignature = (ctx) => {
    const sig = processedSigRef.current || sigImgRef.current;
    if (!sig) return;
    ctx.save();
    ctx.globalAlpha = opacity / 100;
    const cx = sigPos.x + sigSize.w / 2;
    const cy = sigPos.y + sigSize.h / 2;
    ctx.translate(cx, cy);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.drawImage(sig, -sigSize.w / 2, -sigSize.h / 2, sigSize.w, sigSize.h);
    ctx.restore();
  };

  useEffect(() => { renderCanvas(); }, [sigPos, sigSize, rotate, opacity, page]);

  const onMouseDown = (e) => {
    if (!sigPreview) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top)  * scaleY;
    if (mx >= sigPos.x && mx <= sigPos.x + sigSize.w &&
        my >= sigPos.y && my <= sigPos.y + sigSize.h) {
      setDragging(true);
      setDragOffset({ x: mx - sigPos.x, y: my - sigPos.y });
    }
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    setSigPos({
      x: (e.clientX - rect.left) * scaleX - dragOffset.x,
      y: (e.clientY - rect.top)  * scaleY - dragOffset.y,
    });
  };

  const onMouseUp = () => setDragging(false);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `signed_${pdfFile?.name || "document"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const panels = [
    { id: "position", label: "📐 Size & Position" },
    { id: "style",    label: "🎨 Style" },
  ];

  return (
    <div>
      <h2 className="tool-title">✍️ Signature Inserter</h2>
      <p className="tool-subtitle">Upload a PDF and your signature or seal image. Edit, position, and download.</p>

      <div className="tool-row" style={{ marginBottom: "1.25rem" }}>
        <div className="field-group">
          <label className="field-label">Upload PDF Document</label>
          <label className="upload-zone" style={{ cursor: "pointer" }}>
            <input type="file" accept=".pdf" onChange={handlePdf} style={{ display: "none" }} />
            {pdfFile
              ? <><div className="upload-zone-icon">📄</div><div className="upload-zone-filename">{pdfFile.name}</div><div className="upload-zone-hint">Click to change</div></>
              : <><div className="upload-zone-icon">📄</div><div className="upload-zone-text">Click to upload PDF</div></>}
          </label>
        </div>

        <div className="field-group">
          <label className="field-label">Upload Signature Image</label>
          <label className="upload-zone" style={{ cursor: "pointer" }}>
            <input type="file" accept="image/*" onChange={handleSig} style={{ display: "none" }} />
            {sigPreview
              ? <><img src={sigPreview} alt="sig" style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }} /><div className="upload-zone-hint" style={{ marginTop: 6 }}>Click to change</div></>
              : <><div className="upload-zone-icon">✍️</div><div className="upload-zone-text">Click to upload signature</div><div className="upload-zone-hint">PNG recommended</div></>}
          </label>
        </div>
      </div>

      {/* Edit Controls */}
      {sigPreview && (
        <div style={{ background: "#F4F6FB", border: "1px solid #DDE3EE", borderRadius: 10, padding: "1rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            {panels.map(p => (
              <button key={p.id} onClick={() => setActivePanel(p.id)}
                style={{
                  padding: "0.3rem 0.85rem", borderRadius: 6, fontSize: "0.82rem", fontWeight: 600,
                  border: "1px solid #DDE3EE", cursor: "pointer",
                  background: activePanel === p.id ? "#1B2E4E" : "#fff",
                  color: activePanel === p.id ? "#fff" : "#4A5568",
                }}
              >{p.label}</button>
            ))}
          </div>

          {activePanel === "position" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="tool-row">
                <div className="field-group">
                  <label className="field-label">Width: {sigSize.w}px</label>
                  <input type="range" min={40} max={500} value={sigSize.w}
                    onChange={e => setSigSize(p => ({ ...p, w: +e.target.value }))} style={{ width: "100%" }} />
                </div>
                <div className="field-group">
                  <label className="field-label">Height: {sigSize.h}px</label>
                  <input type="range" min={20} max={300} value={sigSize.h}
                    onChange={e => setSigSize(p => ({ ...p, h: +e.target.value }))} style={{ width: "100%" }} />
                </div>
              </div>
              <div className="tool-row">
                <div className="field-group">
                  <label className="field-label">X Position: {Math.round(sigPos.x)}px</label>
                  <input type="range" min={0} max={800} value={sigPos.x}
                    onChange={e => setSigPos(p => ({ ...p, x: +e.target.value }))} style={{ width: "100%" }} />
                </div>
                <div className="field-group">
                  <label className="field-label">Y Position: {Math.round(sigPos.y)}px</label>
                  <input type="range" min={0} max={1100} value={sigPos.y}
                    onChange={e => setSigPos(p => ({ ...p, y: +e.target.value }))} style={{ width: "100%" }} />
                </div>
              </div>
            </div>
          )}

          {activePanel === "style" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="tool-row">
                <div className="field-group">
                  <label className="field-label">Rotation: {rotate}°</label>
                  <input type="range" min={-180} max={180} value={rotate}
                    onChange={e => setRotate(+e.target.value)} style={{ width: "100%" }} />
                  <button onClick={() => setRotate(0)}
                    style={{ marginTop: 4, fontSize: "0.75rem", background: "none", border: "1px solid #DDE3EE", borderRadius: 4, padding: "0.2rem 0.5rem", cursor: "pointer", color: "#4A5568" }}>
                    Reset
                  </button>
                </div>
                <div className="field-group">
                  <label className="field-label">Opacity: {opacity}%</label>
                  <input type="range" min={10} max={100} value={opacity}
                    onChange={e => setOpacity(+e.target.value)} style={{ width: "100%" }} />
                </div>
              </div>

              <div className="field-group">
                <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={removeBg} onChange={e => setRemoveBg(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  <span className="field-label" style={{ margin: 0 }}>Remove white background</span>
                </label>
                <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: 4 }}>
                  Makes light/white pixels transparent — keeps original signature ink color
                </p>
              </div>

              {removeBg && (
                <div className="field-group">
                  <label className="field-label">Sensitivity: {bgThreshold}</label>
                  <input type="range" min={100} max={254} value={bgThreshold}
                    onChange={e => setBgThreshold(+e.target.value)} style={{ width: "100%" }} />
                  <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: 4 }}>
                    Lower = keep more · Higher = remove more background
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Canvas Preview */}
      {pdfFile ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.82rem", color: "#4A5568", fontWeight: 600 }}>Page {page} of {totalPages}</span>
            <button className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
              disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <button className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.8rem" }}
              disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
            {sigPreview && <span style={{ fontSize: "0.78rem", color: "#718096" }}>💡 Drag signature to reposition</span>}
          </div>

           <div style={{ border: "1px solid #DDE3EE", borderRadius: 8, overflow: "auto", width: "100%", cursor: dragging ? "grabbing" : sigPreview ? "grab" : "default" }}>
            <canvas ref={canvasRef} style={{ display: "block", width: "auto" }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
          </div>

          <div className="btn-row" style={{ marginTop: "1rem" }}>
            <button className="btn-primary" onClick={handleDownload} disabled={!sigPreview}>
              ⬇ Download Signed Page
            </button>
          </div>
          {!sigPreview && <p style={{ fontSize: "0.8rem", color: "#718096", marginTop: "0.5rem" }}>Upload a signature to enable download.</p>}
        </div>
      ) : (
        <div className="tool-coming" style={{ minHeight: 180 }}>
          <p className="tool-coming-emoji">📄</p>
          <p style={{ color: "#718096", fontSize: "0.9rem" }}>Upload a PDF to get started</p>
        </div>
      )}
    </div>
  );
}