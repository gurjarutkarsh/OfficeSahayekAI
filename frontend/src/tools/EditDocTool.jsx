import { useState, useRef, useCallback } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";
const FONT_SIZES = [8,10,11,12,13,14,16,18,20,22,24,28,32,36];
const FONTS = ["Arial","Times New Roman","Georgia","Courier New","Verdana"];

export default function EditDocTool() {
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [textBoxes, setTextBoxes] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [boxStyles, setBoxStyles] = useState({});
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const editorRefs = useRef({});
  const boxHtml = useRef({});
  const activeIdRef = useRef(null);  // persists across blur
  const nextId = useRef(1);

  // Always update both state and ref together
  const setActive = (id) => {
    activeIdRef.current = id;
    setActiveId(id);
  };

  const handleFile = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(""); setLoading(true);
    setPages([]); setTextBoxes({}); setBoxStyles({});
    activeIdRef.current = null; setActiveId(null);
    editorRefs.current = {}; boxHtml.current = {};
    setFilename(f.name);
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

  const getImgSize = () => {
    const el = imgRef.current;
    if (!el) return { w: 800, h: 1100 };
    const rect = el.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
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
    setActive(null);
  };

  // Uses ref so it works even after blur
  const updateStyle = (key, value) => {
    const id = activeIdRef.current;
    if (!id) return;
    setBoxStyles(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [key]: value } }));
  };

  const pctToPx = (box) => {
    const { w, h } = getImgSize();
    return { x:(box.xPct/100)*w, y:(box.yPct/100)*h, w:(box.wPct/100)*w, h:(box.hPct/100)*h };
  };

  const onBoxMouseDown = (e, id) => {
    if (e.target.closest("[data-nd]")) return;
    e.preventDefault();
    const box = getBoxes().find(b => b.id===id);
    if (!box) return;
    const rect = imgRef.current.getBoundingClientRect();
    const px = pctToPx(box);
    setDragState({ id, ox: e.clientX-rect.left-px.x, oy: e.clientY-rect.top-px.y });
    setActive(id);
  };

  const onResizeMouseDown = (e, id) => {
    e.preventDefault(); e.stopPropagation();
    const box = getBoxes().find(b => b.id===id);
    if (!box) return;
    const px = pctToPx(box);
    setResizeState({ id, sx:e.clientX, sy:e.clientY, sw:px.w, sh:px.h });
  };

  const onMouseMove = useCallback((e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { w, h } = { w: rect.width, h: rect.height };
    if (dragState) {
      const xPx = Math.max(0, e.clientX-rect.left-dragState.ox);
      const yPx = Math.max(0, e.clientY-rect.top-dragState.oy);
      updateBoxPos(dragState.id, (xPx/w)*100, (yPx/h)*100);
    }
    if (resizeState) {
      const nw = Math.max(80, resizeState.sw + e.clientX - resizeState.sx);
      const nh = Math.max(30, resizeState.sh + e.clientY - resizeState.sy);
      updateBoxSize(resizeState.id, (nw/w)*100, (nh/h)*100);
    }
  }, [dragState, resizeState]);

  const onMouseUp = useCallback(() => { setDragState(null); setResizeState(null); }, []);

  const handleDownload = () => {
    const imgEl = imgRef.current;
    if (!imgEl) return;
    const rw = imgEl.getBoundingClientRect().width;
    const nw = imgEl.naturalWidth;
    const nh = imgEl.naturalHeight;
    const scale = nw / rw;

    const pagesHtml = pages.map((pageUrl, pi) => {
      const boxes = textBoxes[pi] || [];
      const boxesHtml = boxes.map(b => {
        const html = editorRefs.current[b.id]?.innerHTML || boxHtml.current[b.id] || "";
        const st = boxStyles[b.id] || {};
        const x = Math.round((b.xPct/100)*nw);
        const y = Math.round((b.yPct/100)*nh);
        const bw = Math.round((b.wPct/100)*nw);
        const bh = Math.round((b.hPct/100)*nh);
        const fs = Math.round((st.fontSize||14) * scale);
        return `<div style="position:absolute;left:${x}px;top:${y}px;width:${bw}px;min-height:${bh}px;
          font-size:${fs}px;font-family:${st.fontFamily||"Arial"},sans-serif;
          font-weight:${st.bold?"bold":"normal"};font-style:${st.italic?"italic":"normal"};
          text-decoration:${st.underline?"underline":"none"};text-align:${st.align||"left"};
          color:${st.color||"#1A1A2E"};line-height:1.6;">${html}</div>`;
      }).join("");
      return `<div style="position:relative;width:${nw}px;min-height:${nh}px;page-break-after:always;background:#fff;">
        <img src="${pageUrl}" style="display:block;width:${nw}px;height:auto;"/>
        <div style="position:absolute;top:0;left:0;width:${nw}px;height:${nh}px;">${boxesHtml}</div>
      </div>`;
    }).join("");

    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${filename}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box;}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      @page{size:A4;margin:0;}}</style>
      </head><body>${pagesHtml}
      <script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  };

  const boxes = getBoxes();
  const activeStyle = boxStyles[activeId] || {};
  const bs = { padding:"0.28rem 0.55rem", borderRadius:4, fontSize:"0.8rem", fontWeight:600, border:"1px solid #DDE3EE", cursor:"pointer", background:"#fff", color:"#1B2E4E" };
  const bsOn = (on) => ({ ...bs, background: on?"#1B2E4E":"#fff", color: on?"#fff":"#1B2E4E" });

  return (
    <div>
      <h2 className="tool-title">✏️ Edit Document</h2>
      <p className="tool-subtitle">Upload any PDF, photo, or letterhead. Add text boxes, drag to position, download.</p>

      <div className="field-group" style={{ marginBottom:"1rem" }}>
        <label className="field-label">Upload Document or Image</label>
        <label className="upload-zone" style={{ cursor:"pointer" }}>
          <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} style={{ display:"none" }} />
          {filename
            ? <><div className="upload-zone-icon">📄</div><div className="upload-zone-filename">{filename}</div><div className="upload-zone-hint">Click to change</div></>
            : <><div className="upload-zone-icon">📄</div><div className="upload-zone-text">Click to upload PDF, JPG, or PNG</div><div className="upload-zone-hint">Each PDF page shown separately</div></>}
        </label>
      </div>

      {loading && <div className="tool-loading"><div className="spinner"/>Loading document…</div>}
      {error   && <div className="tool-error">⚠️ {error}</div>}

      {pages.length > 0 && (<>
        <div style={{ display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.75rem", flexWrap:"wrap" }}>
          {pages.length > 1 && <>
            <button className="btn-secondary" style={{ padding:"0.28rem 0.7rem", fontSize:"0.8rem" }}
              disabled={currentPage===0} onClick={()=>{setCurrentPage(p=>p-1);setActive(null);}}>← Prev</button>
            <span style={{ fontSize:"0.85rem", color:"#4A5568", fontWeight:600 }}>Page {currentPage+1} / {pages.length}</span>
            <button className="btn-secondary" style={{ padding:"0.28rem 0.7rem", fontSize:"0.8rem" }}
              disabled={currentPage===pages.length-1} onClick={()=>{setCurrentPage(p=>p+1);setActive(null);}}>Next →</button>
          </>}
          <button className="btn-primary" style={{ padding:"0.35rem 1rem", fontSize:"0.85rem" }} onClick={addBox}>+ Add Text Box</button>
          <span style={{ fontSize:"0.72rem", color:"#718096" }}>Drag border to move · Orange corner to resize</span>
        </div>

        {/* Toolbar */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:"0.3rem", padding:"0.5rem 0.6rem",
          background:"#F4F6FB", border:"1px solid #DDE3EE", borderRadius:"8px 8px 0 0",
          opacity: activeId ? 1 : 0.45 }}>

          <button style={bsOn(activeStyle.bold)}
            onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("bold",!activeStyle.bold)}><b>B</b></button>
          <button style={bsOn(activeStyle.italic)}
            onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("italic",!activeStyle.italic)}><i>I</i></button>
          <button style={bsOn(activeStyle.underline)}
            onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("underline",!activeStyle.underline)}><u>U</u></button>

          <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>

          <select style={{...bs,padding:"0.2rem 0.35rem"}}
            value={activeStyle.fontSize||14}
            onMouseDown={e=>e.preventDefault()}
            onChange={e=>updateStyle("fontSize",+e.target.value)}>
            {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
          </select>

          <select style={{...bs,padding:"0.2rem 0.35rem"}}
            value={activeStyle.fontFamily||"Arial"}
            onMouseDown={e=>e.preventDefault()}
            onChange={e=>updateStyle("fontFamily",e.target.value)}>
            {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
          </select>

          <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>

          {[["left","⬅"],["center","☰"],["right","➡"]].map(([a,l])=>(
            <button key={a} style={bsOn(activeStyle.align===a)}
              onMouseDown={e=>e.preventDefault()} onClick={()=>updateStyle("align",a)}>{l}</button>
          ))}

          <div style={{width:1,background:"#DDE3EE",margin:"0 0.15rem"}}/>

          <label style={{display:"flex",alignItems:"center",gap:3,fontSize:"0.75rem",color:"#4A5568",cursor:"pointer"}}
            onMouseDown={e=>e.preventDefault()}>
            A<input type="color" value={activeStyle.color||"#1A1A2E"}
              onChange={e=>updateStyle("color",e.target.value)}
              style={{width:20,height:20,border:"none",cursor:"pointer",padding:0}}/>
          </label>

          {activeId ? (
            <div style={{display:"flex",gap:"0.4rem",marginLeft:"auto"}}>
              <button style={{...bs,background:"#EDF1F7",color:"#4A5568"}}
                onMouseDown={e=>e.preventDefault()} onClick={()=>setActive(null)}>✕ Deselect</button>
              <button style={{...bs,background:"#FDECEA",border:"1px solid #F5B7B1",color:"#C0392B"}}
                onMouseDown={e=>e.preventDefault()} onClick={()=>deleteBox(activeId)}>🗑 Delete</button>
            </div>
          ) : (
            <span style={{marginLeft:"auto",fontSize:"0.7rem",color:"#718096",alignSelf:"center"}}>Click a box to edit</span>
          )}
        </div>

        {/* Canvas */}
        <div ref={containerRef}
          onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onClick={()=>{}}
          style={{ position:"relative", border:"1px solid #DDE3EE", borderTop:"none",
            borderRadius:"0 0 8px 8px", background:"#fff", overflow:"hidden",
            marginBottom:"1rem", userSelect:(dragState||resizeState)?"none":"auto" }}>

          <img ref={imgRef} src={pages[currentPage]} alt={`Page ${currentPage+1}`}
            style={{display:"block",width:"100%",height:"auto"}}/>

          {boxes.map(box => {
            const st = boxStyles[box.id] || {};
            const px = pctToPx(box);
            return (
              <div key={box.id}
                onMouseDown={e=>onBoxMouseDown(e,box.id)}
                onClick={e=>e.stopPropagation()}
                style={{ position:"absolute", left:px.x, top:px.y, width:px.w, minHeight:px.h,
                  border: activeId===box.id ? "2px solid #E07B39":"2px dashed #aaa",
                  borderRadius:3, zIndex:10,
                  cursor: dragState?.id===box.id?"grabbing":"grab",
                  boxSizing:"border-box" }}>
                <div data-nd="true"
                  ref={el=>{ editorRefs.current[box.id]=el; }}
                  contentEditable suppressContentEditableWarning
                  onMouseDown={e=>e.stopPropagation()}
                  onFocus={()=>setActive(box.id)}
                  onBlur={()=>{}}
                  onInput={e=>{ boxHtml.current[box.id]=e.currentTarget.innerHTML; }}
                  style={{ width:"100%", minHeight:px.h-4, padding:"4px 6px",
                    outline:"none", cursor:"text", background:"transparent",
                    fontSize: st.fontSize||14, fontFamily: st.fontFamily||"Arial",
                    fontWeight: st.bold?"bold":"normal",
                    fontStyle: st.italic?"italic":"normal",
                    textDecoration: st.underline?"underline":"none",
                    textAlign: st.align||"left",
                    color: st.color||"#1A1A2E", lineHeight:1.6 }}/>
                <div data-nd="true" onMouseDown={e=>onResizeMouseDown(e,box.id)}
                  style={{position:"absolute",bottom:0,right:0,width:14,height:14,
                    background:"#E07B39",borderRadius:"3px 0 3px 0",cursor:"se-resize",zIndex:20}}/>
              </div>
            );
          })}
        </div>

        <div className="btn-row">
          <button className="btn-primary" onClick={handleDownload}>⬇ Download as PDF</button>
          <button className="btn-secondary" onClick={()=>{
            setPages([]); setTextBoxes({}); setBoxStyles({}); setFilename("");
            activeIdRef.current=null; setActiveId(null);
            editorRefs.current={}; boxHtml.current={};
          }}>🗑 Clear</button>
        </div>
      </>)}
    </div>
  );
}