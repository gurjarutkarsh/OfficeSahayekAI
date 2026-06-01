import { useState, useRef, useCallback } from "react";
import axios from "axios";
import ImageLibrary from "./Imagelibrary.jsx";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const FONT_SIZES = [8,10,11,12,13,14,16,18,20,22,24,28,32,36];
const FONTS = ["Arial","Times New Roman","Georgia","Courier New","Verdana"];

export default function EditDocTool() {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [mode, setMode] = useState("crop"); // "crop" | "edit"
  // Crop state
  const [cropStart, setCropStart] = useState(null);
  const [cropRect, setCropRect] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [croppedPages, setCroppedPages] = useState({});
  // Edit state
  const [textBoxes, setTextBoxes] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [boxStyles, setBoxStyles] = useState({});
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const editorRefs = useRef({});
  const boxHtml = useRef({});
  const activeIdRef = useRef(null);
  const nextId = useRef(1);

  const setActive = useCallback((id) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setLoading(true);
    setPages([]); setTextBoxes({}); setBoxStyles({});
    setCroppedPages({}); setCropRect(null);
    activeIdRef.current = null; setActiveId(null);
    editorRefs.current = {}; boxHtml.current = {};
    setFilename(f.name);
    setMode("crop");
    const ext = f.name.split(".").pop().toLowerCase();
    if (ext === "pdf") {
      const fd = new FormData();
      fd.append("file", f);
      try {
        const res = await axios.post(`${API}/convert/pdf-to-images`, fd);
        setPages(res.data.pages || []);
        setCurrentPage(0);
      } catch { setError("Failed to load PDF. Is the backend running?"); }
    } else if (["jpg","jpeg","png"].includes(ext)) {
      setPages([URL.createObjectURL(f)]); setCurrentPage(0);
    } else {
      setError("Please upload a PDF, JPG, or PNG.");
    }
    setLoading(false);
  };

  // ── Current page image (cropped if available) ─────────
  const getCurrentImg = () => croppedPages[currentPage] || pages[currentPage];

  // ── Crop handlers ──────────────────────────────────────
  const getEventPos = (e) => {
  if (e.touches && e.touches.length > 0) {
    return {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    };
  }

  return {
    clientX: e.clientX,
    clientY: e.clientY,
  };
};

  const onCropStart = (e) => {
    e.preventDefault();
    const { clientX, clientY } = getEventPos(e);
    const rect = imgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    setCropStart({ x, y });
    setCropRect({ x, y, w: 0, h: 0 });
    setIsCropping(true);
  };

  const onCropMove = (e) => {
    if (!isCropping || !cropStart) return;
    e.preventDefault();
    const { clientX, clientY } = getEventPos(e);
    const el = imgRef.current;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
    setCropRect({
      x: Math.min(cropStart.x, x),
      y: Math.min(cropStart.y, y),
      w: Math.abs(x - cropStart.x),
      h: Math.abs(y - cropStart.y),
    });
  };

  const onCropEnd = () => { setIsCropping(false); };

  // Keep mouse aliases for desktop
  const onCropMouseDown = onCropStart;
  const onCropMouseMove = onCropMove;
  const onCropMouseUp   = onCropEnd;

  const applyCrop = () => {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) {
      setError("Please drag to select a crop area first."); return;
    }
    const imgEl = imgRef.current;
    const rect = imgEl.getBoundingClientRect();
    const scaleX = imgEl.naturalWidth  / rect.width;
    const scaleY = imgEl.naturalHeight / rect.height;

    const canvas = document.createElement("canvas");
    canvas.width  = Math.round(cropRect.w * scaleX);
    canvas.height = Math.round(cropRect.h * scaleY);
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img,
        cropRect.x * scaleX, cropRect.y * scaleY,
        cropRect.w * scaleX, cropRect.h * scaleY,
        0, 0, canvas.width, canvas.height
      );
      const croppedUrl = canvas.toDataURL("image/png");
      setCroppedPages(prev => ({ ...prev, [currentPage]: croppedUrl }));
      setCropRect(null);
      setCropStart(null);
    };
    img.src = pages[currentPage];
  };

  const resetCrop = () => {
    setCroppedPages(prev => { const n={...prev}; delete n[currentPage]; return n; });
    setCropRect(null);
  };

  const proceedToEdit = () => { setMode("edit"); setActive(null); };

  // ── Text box helpers ───────────────────────────────────
  const getImgSize = () => {
    const el = imgRef.current;
    if (!el) return { w:800, h:1100 };
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };

  const getBoxes = () => textBoxes[currentPage] || [];

  const addBox = () => {
    const id = nextId.current++;
    boxHtml.current[id] = "";
    const { w, h } = getImgSize();
    setBoxStyles(prev => ({ ...prev, [id]: { fontSize:14, fontFamily:"Arial", bold:false, italic:false, underline:false, color:"#1A1A2E", align:"left" } }));
    setTextBoxes(prev => ({
      ...prev,
      [currentPage]: [...(prev[currentPage]||[]), { id, xPct:(50/w)*100, yPct:(80/h)*100, wPct:(260/w)*100, hPct:(50/h)*100 }]
    }));
    setActive(id);
  };

  const updateBoxPos = (id, xPct, yPct) =>
    setTextBoxes(prev => ({ ...prev, [currentPage]: (prev[currentPage]||[]).map(b => b.id===id ? {...b,xPct,yPct} : b) }));

  const updateBoxSize = (id, wPct, hPct) =>
    setTextBoxes(prev => ({ ...prev, [currentPage]: (prev[currentPage]||[]).map(b => b.id===id ? {...b,wPct,hPct} : b) }));

  const deleteBox = (id) => {
    delete editorRefs.current[id]; delete boxHtml.current[id];
    setTextBoxes(prev => ({ ...prev, [currentPage]: (prev[currentPage]||[]).filter(b => b.id!==id) }));
    setBoxStyles(prev => { const n={...prev}; delete n[id]; return n; });
    activeIdRef.current = null; setActiveId(null);
  };

  const updateStyle = useCallback((key, value) => {
    const id = activeIdRef.current;
    if (!id) return;
    setBoxStyles(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [key]: value } }));
  }, []);

  const pctToPx = (box) => {
    const { w, h } = getImgSize();
    return { x:(box.xPct/100)*w, y:(box.yPct/100)*h, w:(box.wPct/100)*w, h:(box.hPct/100)*h };
  };

  const onBoxMouseDown = (e, id) => {
    if (e.target.closest("[data-nd]")) return;
    e.preventDefault();
    if (e.currentTarget.setPointerCapture)
      e.currentTarget.setPointerCapture(e.pointerId);
    const box = getBoxes().find(b => b.id===id);
    if (!box) return;
    const rect = imgRef.current.getBoundingClientRect();
    const { clientX, clientY } = getEventPos(e);
    const px = pctToPx(box);
    setDragState({ id, ox: clientX-rect.left-px.x, oy: clientY-rect.top-px.y });
    setActive(id);
  };

  const onResizeMouseDown = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const box = getBoxes().find(b => b.id===id);
    if (!box) return;
    const px = pctToPx(box);
    const { clientX, clientY } = getEventPos(e);
    setResizeState({ id, sx:clientX, sy:clientY, sw:px.w, sh:px.h });
  };

  const onEditMouseMove = useCallback((e) => {
    const el = imgRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.round(rect.width), h = Math.round(rect.height);
    const { clientX, clientY } = getEventPos(e);
    if (dragState) {
      updateBoxPos(dragState.id,
        Math.max(0,(clientX-rect.left-dragState.ox)/w*100),
        Math.max(0,(clientY-rect.top-dragState.oy)/h*100)
      );
    }
    if (resizeState) {
      updateBoxSize(resizeState.id,
        Math.max(80, resizeState.sw+clientX-resizeState.sx)/w*100,
        Math.max(30, resizeState.sh+clientY-resizeState.sy)/h*100
      );
    }
  }, [dragState, resizeState]);

  const onMouseUp = useCallback(() => { setDragState(null); setResizeState(null); setIsCropping(false); }, []);

  const handleDownload = () => {
    const imgEl = imgRef.current;
    if (!imgEl) return;

    // Get actual rendered dimensions using getBoundingClientRect
    const rect = imgEl.getBoundingClientRect();
    const rw = rect.width;
    const rh = rect.height;

    const pagesHtml = pages.map((_, pi) => {
      const pageUrl = croppedPages[pi] || pages[pi];
      const boxes = textBoxes[pi] || [];

      const boxesHtml = boxes.map(b => {
        const el = editorRefs.current[b.id];
        const html = (el ? el.innerHTML : null) || boxHtml.current[b.id] || "";
        const st = boxStyles[b.id] || {};
        const x  = Math.round((b.xPct / 100) * rw)+6;
        const y  = Math.round((b.yPct / 100) * rh);
        const bw = Math.round((b.wPct / 100) * rw);
        const bh = Math.round((b.hPct / 100) * rh);
        return "<div style=\"position:absolute;left:" + x + "px;top:" + y + "px;width:" + bw + "px;height:" + bh + "px;" +
          "padding-top:20px;padding-left:0px;padding-right:0px;padding-bottom:4px;" +
          "font-size:" + (st.fontSize||14) + "px;font-family:" + (st.fontFamily||"Arial") + ",sans-serif;" +
          "font-weight:" + (st.bold?"bold":"normal") + ";font-style:" + (st.italic?"italic":"normal") + ";" +
          "text-decoration:" + (st.underline?"underline":"none") + ";text-align:" + (st.align||"left") + ";" +
          "color:" + (st.color||"#1A1A2E") + ";line-height:1.6;box-sizing:border-box;\">" +
          html +
          "</div>";
      }).join("");

      return "<div style=\"position:relative;width:" + rw + "px;height:" + rh + "px;page-break-after:always;background:#fff;overflow:hidden;\">" +
        "<img src=\"" + pageUrl + "\" style=\"display:block;width:" + rw + "px;height:" + rh + "px;object-fit:fill;\"/>" +
        "<div style=\"position:absolute;top:0;left:0;width:" + rw + "px;height:" + rh + "px;\">" + boxesHtml + "</div>" +
        "</div>";
    }).join("");

    const w = window.open("", "_blank");
    w.document.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>" + filename + "</title>" +
      "<style>*{margin:0;padding:0;box-sizing:border-box;}body{width:" + rw + "px;background:#fff;}" +
      "@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}" +
      "@page{size:" + rw + "px " + rh + "px;margin:0;}}</style>" +
      "</head><body>" + pagesHtml +
      "<scr" + "ipt>window.onload=function(){window.print();}<\/scr" + "ipt></body></html>");
    w.document.close();

    console.log({
      renderedWidth: imgEl.getBoundingClientRect().width,
      renderedHeight: imgEl.getBoundingClientRect().height,
      naturalWidth: imgEl.naturalWidth,
      naturalHeight: imgEl.naturalHeight,
    });
  };

  const boxes = getBoxes();
  const activeStyle = boxStyles[activeId] || {};
  const bs  = { padding:"0.28rem 0.55rem", borderRadius:4, fontSize:"0.8rem", fontWeight:600, border:"1px solid #DDE3EE", cursor:"pointer", background:"#fff", color:"#1B2E4E" };
  const bsOn = (on) => ({ ...bs, background:on?"#1B2E4E":"#fff", color:on?"#fff":"#1B2E4E" });

  return (
    <div>
      <h2 className="tool-title">✏️ Edit Document</h2>
      <p className="tool-subtitle">Upload a PDF or image, crop if needed, add text boxes, then download.</p>

      {/* Upload */}
      <div className="field-group" style={{ marginBottom:"1rem" }}>
        <label className="field-label">Upload Document or Image</label>
        <label className="upload-zone" style={{ cursor:"pointer" }}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display:"none" }} />
          {filename
            ? <><div className="upload-zone-icon">📄</div><div className="upload-zone-filename">{filename}</div><div className="upload-zone-hint">Click to change</div></>
            : <><div className="upload-zone-icon">📄</div><div className="upload-zone-text">Click to upload PDF, JPG, or PNG</div><div className="upload-zone-hint">Each PDF page shown separately</div></>}
        </label>
        <ImageLibrary type="letterhead" label="Letterhead"
          onSelect={(url) => {
            setPages([url]); setCurrentPage(0);
            setTextBoxes({}); setFilename("Saved Letterhead");
            setCroppedPages({}); setCropRect(null); setMode("crop");
          }} />
      </div>

      {loading && <div className="tool-loading"><div className="spinner"/>Loading document…</div>}
      {error   && <div className="tool-error">⚠️ {error}</div>}

      {pages.length > 0 && (<>
        {/* Mode switcher */}
        <div style={{ display:"flex", gap:"0.5rem", marginBottom:"0.75rem", alignItems:"center", flexWrap:"wrap" }}>
          <button
            style={{ ...bs, background: mode==="crop"?"#1B2E4E":"#EDF1F7", color: mode==="crop"?"#fff":"#1B2E4E" }}
            onClick={() => setMode("crop")}>✂️ Crop</button>
          <button
            style={{ ...bs, background: mode==="edit"?"#1B2E4E":"#EDF1F7", color: mode==="edit"?"#fff":"#1B2E4E" }}
            onClick={() => setMode("edit")}>✏️ Edit</button>
          {pages.length > 1 && <>
            <div style={{width:1,background:"#DDE3EE",margin:"0 0.25rem"}}/>
            <button style={{...bs,padding:"0.28rem 0.7rem"}} disabled={currentPage===0}
              onClick={()=>{setCurrentPage(p=>p-1);setActive(null);setCropRect(null);}}>← Prev</button>
            <span style={{fontSize:"0.85rem",color:"#4A5568",fontWeight:600}}>Page {currentPage+1}/{pages.length}</span>
            <button style={{...bs,padding:"0.28rem 0.7rem"}} disabled={currentPage===pages.length-1}
              onClick={()=>{setCurrentPage(p=>p+1);setActive(null);setCropRect(null);}}>Next →</button>
          </>}
          {mode==="edit" && (
            <button className="btn-primary" style={{padding:"0.35rem 1rem",fontSize:"0.85rem",marginLeft:"auto"}} onClick={addBox}>
              + Add Text Box
            </button>
          )}
        </div>

        {/* Crop instructions */}
        {mode === "crop" && (
          <div style={{ background:"#EDF1F7", borderRadius:8, padding:"0.6rem 0.85rem", marginBottom:"0.75rem",
            fontSize:"0.82rem", color:"#2D4A70", display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap" }}>
            <span>✂️ <b>Crop mode:</b> Drag on the image to select the area to keep.</span>
            {cropRect && cropRect.w > 10 && (
              <div style={{display:"flex",gap:"0.5rem",marginLeft:"auto"}}>
                <button onClick={applyCrop}
                  style={{...bs,background:"#2D6A4F",color:"#fff",border:"none"}}>✓ Apply Crop</button>
                <button onClick={()=>setCropRect(null)} style={bs}>✕ Cancel</button>
              </div>
            )}
            {croppedPages[currentPage] && (
              <button onClick={resetCrop}
                style={{...bs,background:"#FDECEA",border:"1px solid #F5B7B1",color:"#C0392B",marginLeft:"auto"}}>
                ↺ Reset Crop
              </button>
            )}
          </div>
        )}

        {/* Edit toolbar */}
        {mode === "edit" && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", padding:"0.5rem 0.6rem",
            background:"#F4F6FB", border:"1px solid #DDE3EE", borderRadius:"8px 8px 0 0",
            opacity: activeId ? 1 : 0.45 }}>
            <button style={bsOn(activeStyle.bold)} onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("bold",!activeStyle.bold)}><b>B</b></button>
            <button style={bsOn(activeStyle.italic)} onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("italic",!activeStyle.italic)}><i>I</i></button>
            <button style={bsOn(activeStyle.underline)} onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("underline",!activeStyle.underline)}><u>U</u></button>
            <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>
            <select style={{...bs,padding:"0.2rem 0.35rem"}} value={activeStyle.fontSize||14} onChange={e=>updateStyle("fontSize",+e.target.value)}>
              {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
            </select>
            <select style={{...bs,padding:"0.2rem 0.35rem"}} value={activeStyle.fontFamily||"Arial"} onChange={e=>updateStyle("fontFamily",e.target.value)}>
              {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>
            {[["left","⬅"],["center","☰"],["right","➡"]].map(([a,l])=>(
              <button key={a} style={bsOn(activeStyle.align===a)} onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("align",a)}>{l}</button>
            ))}
            <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>
            <label style={{display:"flex",alignItems:"center",gap:3,fontSize:"0.75rem",color:"#4A5568",cursor:"pointer"}} onMouseDown={e=>e.preventDefault()}>
              A<input type="color" value={activeStyle.color||"#1A1A2E"} onChange={e=>updateStyle("color",e.target.value)}
                style={{width:20,height:20,border:"none",cursor:"pointer",padding:0}}/>
            </label>
            {activeId ? (
            <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginLeft:"auto",flexWrap:"wrap"}}>
              <label style={{fontSize:"0.72rem",color:"#4A5568",display:"flex",alignItems:"center",gap:3}}>
                X:
                <input type="number" min={0} max={100} step={0.1}
                  value={activeId ? Math.round((getBoxes().find(b=>b.id===activeId)?.xPct||0)*10)/10 : 0}
                  onChange={e=>{
                    const id=activeIdRef.current; if(!id) return;
                    setTextBoxes(prev=>({...prev,[currentPage]:(prev[currentPage]||[]).map(b=>b.id===id?{...b,xPct:+e.target.value}:b)}));
                  }}
                  style={{width:60,padding:"0.15rem 0.3rem",border:"1px solid #DDE3EE",borderRadius:4,fontSize:"0.75rem"}}/>
                <span style={{fontSize:"0.68rem",color:"#aaa"}}>%</span>
              </label>
              <label style={{fontSize:"0.72rem",color:"#4A5568",display:"flex",alignItems:"center",gap:3}}>
                Y:
                <input type="number" min={0} max={100} step={0.1}
                  value={activeId ? Math.round((getBoxes().find(b=>b.id===activeId)?.yPct||0)*10)/10 : 0}
                  onChange={e=>{
                    const id=activeIdRef.current; if(!id) return;
                    setTextBoxes(prev=>({...prev,[currentPage]:(prev[currentPage]||[]).map(b=>b.id===id?{...b,yPct:+e.target.value}:b)}));
                  }}
                  style={{width:60,padding:"0.15rem 0.3rem",border:"1px solid #DDE3EE",borderRadius:4,fontSize:"0.75rem"}}/>
                <span style={{fontSize:"0.68rem",color:"#aaa"}}>%</span>
              </label>
              <button style={{...bs,background:"#FDECEA",border:"1px solid #F5B7B1",color:"#C0392B"}}
                onMouseDown={e=>e.preventDefault()} onClick={()=>deleteBox(activeId)}>🗑</button>
            </div>
          ) : (
            <span style={{marginLeft:"auto",fontSize:"0.7rem",color:"#718096",alignSelf:"center"}}>Click a box to edit</span>
          )}
          </div>
        )}

        {/* Canvas */}
        <div
          ref={containerRef}
          onPointerMove={mode==="crop" ? onCropMove : onEditMouseMove}
          onPointerUp={onMouseUp}
          onPointerCancel={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchEnd={onMouseUp}
          onClick={mode==="edit" ? () => setActive(null) : undefined}
          style={{
            touchAction: "none",
            position: "relative",
            border: "1px solid #DDE3EE",
            borderTop: mode==="edit" ? "none" : "1px solid #DDE3EE",
            borderRadius: mode==="edit" ? "0 0 8px 8px" : "8px",
            background: "#fff",
            overflow: "hidden",
            marginBottom: "1rem",
            cursor: mode==="crop" ? "crosshair" : "default",
            userSelect: (dragState || resizeState || isCropping)
              ? "none"
              : "auto",
          }}
        >
          <img
            ref={imgRef}
            src={getCurrentImg()}
            alt={`Page ${currentPage + 1}`}
            style={{
              display: "block",
              width: "100%",
              height: "auto",
            }}
            onPointerDown={mode==="crop" ? onCropStart : undefined}
          />
                    {/* Crop overlay */}
          {mode==="crop" && cropRect && cropRect.w > 0 && (
            <>
              {/* Dark overlay outside crop */}
              <div style={{position:"absolute",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.45)",pointerEvents:"none"}}/>
              {/* Clear crop window */}
              <div style={{
                position:"absolute",
                left:cropRect.x, top:cropRect.y,
                width:cropRect.w, height:cropRect.h,
                border:"2px solid #E07B39",
                boxShadow:"0 0 0 9999px rgba(0,0,0,0.45)",
                pointerEvents:"none",
                background:"transparent",
              }}/>
              {/* Size label */}
              <div style={{
                position:"absolute", left:cropRect.x, top:cropRect.y-22,
                background:"#E07B39", color:"#fff", fontSize:"0.7rem",
                padding:"1px 6px", borderRadius:3, pointerEvents:"none",
              }}>
                {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
              </div>
            </>
          )}

          {/* Text boxes (edit mode) */}
          {mode==="edit" && boxes.map(box => {
            const st = boxStyles[box.id] || {};
            return (
              <div key={box.id}
                onClick={e=>{ e.stopPropagation(); setActive(box.id); }}
                style={{
                  position:"absolute",
                  left: box.xPct + "%",
                  top:  box.yPct + "%",
                  width: box.wPct + "%",
                  height: box.hPct + "%",
                  border: activeId===box.id?"2px solid #E07B39":"2px dashed #aaa",
                  borderRadius:3, zIndex:10, boxSizing:"border-box"
                }}>
                {/* Drag handle */}
                <div
                  onPointerDown={e=>onBoxMouseDown(e,box.id)}
                  // onTouchStart={e=>onBoxMouseDown(e,box.id)}
                  style={{
                    position:"absolute", top:0, left:0, right:14, height:18,
                    background: activeId===box.id ? "rgba(224,123,57,0.15)" : "rgba(0,0,0,0.04)",
                    cursor: dragState?.id===box.id?"grabbing":"grab",
                    borderRadius:"3px 3px 0 0",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    zIndex:15,
                  }}>
                  <span style={{fontSize:"0.6rem",color:"#aaa",letterSpacing:2,userSelect:"none"}}>⠿⠿⠿</span>
                </div>
                {/* Editable content */}
                <div data-nd="true"
                  ref={el=>{ editorRefs.current[box.id]=el; }}
                  contentEditable suppressContentEditableWarning
                     onPointerDown={e=> e.stopPropagation()}
                    onFocus={()=>setActive(box.id)}
                    onInput={e=>{ boxHtml.current[box.id]=e.currentTarget.innerHTML; }}
                    onBlur={e=>{ boxHtml.current[box.id]=e.currentTarget.innerHTML; }}
                    style={{ width:"100%", Height:20, paddingTop:20, paddingLeft:6, paddingRight:6, paddingBottom:4,
                      outline:"none", cursor:"text", background:"transparent",
                      fontSize:st.fontSize||14, fontFamily:st.fontFamily||"Arial",
                      fontWeight:st.bold?"bold":"normal", fontStyle:st.italic?"italic":"normal",
                      textDecoration:st.underline?"underline":"none",
                      textAlign:st.align||"left", color:st.color||"#1A1A2E", lineHeight:1.6 }}/>
                  {/* Resize handle */}
                <div data-nd="true" onPointerDown={e=>onResizeMouseDown(e,box.id)}
                  style={{position:"absolute",bottom:0,right:0,width:14,height:14,
                    background:"#E07B39",borderRadius:"3px 0 3px 0",cursor:"se-resize",zIndex:20}}/>
              </div>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="btn-row">
          {mode==="crop" && (
            <button className="btn-primary" onClick={proceedToEdit}>
              ✏️ Done Cropping — Start Editing
            </button>
          )}
          {mode==="edit" && (
            <button className="btn-primary" onClick={handleDownload}>⬇ Download as PDF</button>
          )}
          <button className="btn-secondary" onClick={()=>{
            setPages([]); setTextBoxes({}); setBoxStyles({}); setFilename("");
            setCroppedPages({}); setCropRect(null); setMode("crop");
            activeIdRef.current=null; setActiveId(null);
            editorRefs.current={}; boxHtml.current={};
          }}>🗑 Clear</button>
        </div>
      </>)}
    </div>
  );
}