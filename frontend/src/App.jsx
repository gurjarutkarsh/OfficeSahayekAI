import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./App.css";
import RecentDocs from "./tools/Recentdocs.jsx";

import { API } from "./config.jsx";
// ── Error message helper ──────────────────────────────
const getErrorMessage = (err, context = "") => {
  const status = err?.response?.status;
  const detail = err?.response?.data?.detail;

  if (!navigator.onLine) return "No internet connection. Please check your network.";
  if (status === 429) return "Too many requests. Please wait a minute and try again.";
  if (status === 503 || status === 502) return "AI service is temporarily busy. Please try again in a few seconds.";
  if (status === 413) return "File is too large. Please use a smaller file.";
  if (status === 400) return detail || "Invalid file. Please upload a PDF, PNG, or JPG.";
  if (status === 500) return "Server error. Please make sure the backend is running.";
  if (err?.code === "ERR_NETWORK") return "Cannot connect to server. Please make sure the backend is running.";

  if (context === "upload") return detail || "Failed to analyze document. Please try again.";
  if (context === "chat")   return detail || "Failed to get answer. Please try again.";
  if (context === "translate") return "Translation failed. Please try again.";
  return detail || err?.message || "Something went wrong. Please try again.";
};

// ── Error Box Component ───────────────────────────────
const ErrorBox = ({ message, onDismiss }) => (
  <div className="error-box-enhanced">
    <span className="error-box-icon">⚠️</span>
    <span className="error-box-msg">{message}</span>
    {onDismiss && (
      <button className="error-box-dismiss" onClick={onDismiss}>✕</button>
    )}
  </div>
);

function App({ user, onLogout }) {
  const [file, setFile] = useState(null);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("summary");
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isHindi, setIsHindi] = useState(false);
  const [hindiData, setHindiData] = useState(null);
  const [translateLoading, setTranslateLoading] = useState(false);
  const [translateError, setTranslateError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [fileError, setFileError] = useState("");
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const parseAIResponse = (text) => {
    if (!text) return {};
    if (typeof text === "object") return text;
    const str = String(text);
    const summaryMatch = str.match(/SUMMARY:\s*([\s\S]*?)(?=IMPORTANT_POINTS:)/);
    const pointsMatch  = str.match(/IMPORTANT_POINTS:\s*([\s\S]*?)(?=HINDI_EXPLANATION:)/);
    const hindiMatch   = str.match(/HINDI_EXPLANATION:\s*([\s\S]*?)(?=ACTIONS:)/);
    const actionsMatch = str.match(/ACTIONS:\s*([\s\S]*?)$/);
    return {
      summary: summaryMatch?.[1]?.trim() || "",
      points:  pointsMatch?.[1]?.trim()  || "",
      hindi:   hindiMatch?.[1]?.trim()   || "",
      actions: actionsMatch?.[1]?.trim() || "",
    };
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const validateFile = (f) => {
    if (!f) return "Please select a file.";
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["pdf","png","jpg","jpeg"].includes(ext))
      return "Unsupported file type. Please upload a PDF, PNG, or JPG.";
    if (f.size > 20 * 1024 * 1024)
      return "File is too large. Maximum size is 20MB.";
    return "";
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    const err = validateFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      setError("");
      setResponse(null);
      setChatHistory([]);
      setIsHindi(false);
      setHindiData(null);
      stopSpeech();
    }
  };

  const handleUpload = async () => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    stopSpeech();
    setLoading(true);
    setError("");
    setResponse(null);
    setChatHistory([]);
    setIsHindi(false);
    setHindiData(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      setResponse(res.data);
      setActiveTab("summary");
    } catch (err) {
      setError(getErrorMessage(err, "upload"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    stopSpeech();
    setFile(null);
    setResponse(null);
    setError("");
    setFileError("");
    setChatHistory([]);
    setChatError("");
    setChatInput("");
    setIsHindi(false);
    setHindiData(null);
    setTranslateError("");
  };

  const handleSend = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    setChatError("");
    setChatHistory(prev => [...prev, { role: "user", text: userMsg }]);
    try {
      const res = await axios.post(`${API}/ask`, {
        question: userMsg,
        text: response.text,
        hindi: isHindi,
        history: chatHistory
          .filter(m => m.role === "user" || m.role === "ai")
          .reduce((acc, m, i, arr) => {
            if (m.role === "user" && arr[i+1]?.role === "ai")
              acc.push({ question: m.text, answer: arr[i+1].text });
            return acc;
          }, [])
      });
      setChatHistory(prev => [...prev, { role: "ai", text: res.data.answer }]);
    } catch (err) {
      const msg = getErrorMessage(err, "chat");
      setChatError(msg);
      setChatHistory(prev => [...prev, { role: "error", text: msg }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (isHindi) { setIsHindi(false); return; }
    if (hindiData) { setIsHindi(true); return; }
    setTranslateLoading(true);
    setTranslateError("");
    try {
      const res = await axios.post(`${API}/translate`, {
        summary: englishData.summary,
        points:  englishData.points,
        hindi:   englishData.hindi,
        actions: englishData.actions,
      });
      const parsed = parseAIResponse(res.data.translated);
      setHindiData(parsed);
      setIsHindi(true);
    } catch (err) {
      setTranslateError(getErrorMessage(err, "translate"));
    } finally {
      setTranslateLoading(false);
    }
  };

  const getTabText = () => {
    if (!activeData) return "";
    if (activeTab === "summary") return activeData.summary || "";
    if (activeTab === "points")  return activeData.points  || "";
    if (activeTab === "hindi")   return activeData.hindi   || "";
    if (activeTab === "actions") return activeData.actions || "";
    return "";
  };

  const handleSpeak = () => {
    if (isSpeaking) { stopSpeech(); return; }
    const text = getTabText();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = (isHindi || activeTab === "hindi") ? "hi-IN" : "en-IN";
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleMic = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatError("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = isHindi ? "hi-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setChatInput(prev => prev ? prev + " " + transcript : transcript);
    };
    recognition.onend  = () => setIsListening(false);
    recognition.onerror = (e) => {
      setIsListening(false);
      if (e.error === "not-allowed") setChatError("Microphone access denied. Please allow microphone access.");
      else if (e.error === "no-speech") setChatError("No speech detected. Please try again.");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const englishData = response ? parseAIResponse(response.ai_response?.ai_response) : null;
  const activeData  = isHindi ? hindiData : englishData;

  const SpeakBtn = () => (
    <button className={`speak-btn ${isSpeaking ? "speak-active" : ""}`} onClick={handleSpeak}>
      {isSpeaking ? "⏹ Stop" : "🔊 Listen"}
    </button>
  );

  const tabs = [
    { id: "summary", label: "Summary",        emoji: "📋" },
    { id: "points",  label: "Key Points",     emoji: "🔍" },
    { id: "hindi",   label: "हिंदी",           emoji: "🇮🇳" },
    { id: "actions", label: "Next Steps",     emoji: "✅" },
    { id: "text",    label: "Extracted Text", emoji: "📄" },
  ];

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <div className="logo-block">
            <span className="logo-badge">OS</span>
            <div>
              <h1 className="logo-title">OfficeSahayek AI</h1>
              <p className="logo-sub">Document Assistant</p>
            </div>
          </div>
          <div className="header-right">
            <p className="header-tagline">Upload any document — get instant plain-language answers</p>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <Link to="/edit" className="header-tool-link">🛠 Document Tools</Link>
              <span style={{ fontSize:"0.78rem", color:"rgba(255,255,255,0.6)" }}>
                {user?.name || user?.email}
              </span>
              <button onClick={onLogout}
                style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)",
                  color:"rgba(255,255,255,0.85)", borderRadius:6, padding:"0.2rem 0.6rem",
                  fontSize:"0.75rem", cursor:"pointer", fontFamily:"'Noto Sans',sans-serif" }}>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <RecentDocs onSelect={(doc) => {
          setResponse({
            filename: doc.filename,
            text: doc.extracted_text,
            ai_response: { ai_response: doc.ai_response },
          });
          setActiveTab("summary");
          setChatHistory([]);
          setIsHindi(false);
          setHindiData(null);
        }} />

        <div className="card upload-card">
          <div className="upload-area">
            <label className="file-label">
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleFileChange} />
              <span className="file-btn">Choose File</span>
              <span className="file-name">
                {file ? file.name : "No file chosen — PDF, PNG, JPG supported"}
              </span>
            </label>
            <button className="upload-btn" onClick={handleUpload} disabled={loading || !file}>
              {loading ? <><span className="spinner-inline" /> Processing…</> : "Analyze Document"}
            </button>
            {response && <button className="reset-btn" onClick={handleReset}>✕ Clear</button>}
          </div>

          {fileError && <ErrorBox message={fileError} onDismiss={() => setFileError("")} />}
          {error     && <ErrorBox message={error}     onDismiss={() => setError("")} />}

          {loading && (
            <div className="loading-bar-wrap">
              <div className="loading-bar" />
              <p className="loading-text">Reading and analyzing your document… this may take 15–30 seconds</p>
            </div>
          )}
        </div>

        {response && activeData && (
          <div className="results-wrapper">
            <div className="results-topbar">
              <div className="file-meta">
                <span className="file-meta-icon">📁</span>
                <span className="file-meta-name">{response.filename}</span>
              </div>
              <button
                className={`translate-btn ${isHindi ? "translate-active" : ""}`}
                onClick={handleTranslate} disabled={translateLoading}
              >
                {translateLoading
                  ? <><span className="spinner-inline-dark" /> अनुवाद हो रहा है…</>
                  : isHindi ? "🔤 English" : "अ हिंदी में देखें"}
              </button>
            </div>

            {translateError && <ErrorBox message={translateError} onDismiss={() => setTranslateError("")} />}

            <div className="tabs">
              {tabs.map((tab) => (
                <button key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => { setActiveTab(tab.id); stopSpeech(); }}>
                  <span className="tab-emoji">{tab.emoji}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="card panel">
              {activeTab === "summary" && (
                <div className="panel-body fade-in">
                  <div className="panel-header">
                    <h2 className="panel-title">{isHindi ? "सारांश" : "Plain English Summary"}</h2>
                    <SpeakBtn />
                  </div>
                  {activeData.summary
                    ? <p className={`panel-text ${isHindi ? "hindi-text" : ""}`}>{activeData.summary}</p>
                    : <p className="empty-msg">No summary available.</p>}
                </div>
              )}
              {activeTab === "points" && (
                <div className="panel-body fade-in">
                  <div className="panel-header">
                    <h2 className="panel-title">{isHindi ? "महत्वपूर्ण बिंदु" : "Important Points"}</h2>
                    <SpeakBtn />
                  </div>
                  {activeData.points ? (
                    <ul className="points-list">
                      {activeData.points.split("\n").filter(l => l.trim()).map((line, i) => (
                        <li key={i} className="point-item">
                          <span className="point-num">{i + 1}</span>
                          <span className={isHindi ? "hindi-text" : ""}>{line.replace(/^[-•*]\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="empty-msg">No key points available.</p>}
                </div>
              )}
              {activeTab === "hindi" && (
                <div className="panel-body fade-in">
                  <div className="panel-header">
                    <h2 className="panel-title">हिंदी में समझाइए</h2>
                    <SpeakBtn />
                  </div>
                  {activeData.hindi
                    ? <p className="panel-text hindi-text">{activeData.hindi}</p>
                    : <p className="empty-msg">Hindi explanation not available.</p>}
                </div>
              )}
              {activeTab === "actions" && (
                <div className="panel-body fade-in">
                  <div className="panel-header">
                    <h2 className="panel-title">{isHindi ? "आगे क्या करें" : "What You Should Do Next"}</h2>
                    <SpeakBtn />
                  </div>
                  {activeData.actions ? (
                    <ul className="actions-list">
                      {activeData.actions.split("\n").filter(l => l.trim()).map((line, i) => (
                        <li key={i} className="action-item">
                          <span className="action-check">✓</span>
                          <span className={isHindi ? "hindi-text" : ""}>{line.replace(/^[-•*\d.]\s*/, "")}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="empty-msg">No actions available.</p>}
                </div>
              )}
              {activeTab === "text" && (
                <div className="panel-body fade-in">
                  <div className="panel-header">
                    <h2 className="panel-title">Extracted Text</h2>
                  </div>
                  <div className="extracted-text">{response.text}</div>
                </div>
              )}
            </div>

            {/* Chat with Doc */}
            <div className="chat-section">
              <div className="chat-header">
                <h3 className="chat-title">💬 {isHindi ? "दस्तावेज़ से बात करें" : "Chat with Document"}</h3>
                {chatHistory.length > 0 && (
                  <button className="chat-clear-btn" onClick={() => setChatHistory([])}>Clear chat</button>
                )}
              </div>

              <div className="chat-messages">
                {chatHistory.length === 0 && (
                  <div className="chat-empty">
                    <p>{isHindi ? "कोई भी सवाल पूछें…" : "Ask anything about this document…"}</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`chat-bubble-wrap ${msg.role}`}>
                    <div className={`chat-bubble ${msg.role}`}>
                      <p className={isHindi && msg.role === "ai" ? "hindi-text" : ""}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble-wrap ai">
                    <div className="chat-bubble ai chat-typing"><span/><span/><span/></div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {chatError && (
                <div style={{ padding: "0 1.25rem" }}>
                  <ErrorBox message={chatError} onDismiss={() => setChatError("")} />
                </div>
              )}

              <div className="chat-input-row">
                <input className="chat-input" type="text"
                  placeholder={isHindi ? "यहाँ सवाल टाइप करें…" : "Type your question here…"}
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !chatLoading && handleSend()}
                  disabled={chatLoading} />
                <button className={`mic-btn ${isListening ? "mic-active" : ""}`}
                  onClick={handleMic} title={isListening ? "Stop" : "Speak"}>
                  {isListening ? "🔴" : "🎤"}
                </button>
                <button className="chat-send-btn" onClick={handleSend}
                  disabled={chatLoading || !chatInput.trim()}>
                  {chatLoading ? <span className="spinner-inline" /> : "➤"}
                </button>
              </div>
              {isListening && (
                <p className="listening-msg">🎤 {isHindi ? "सुन रहा हूँ… बोलिए" : "Listening… speak now"}</p>
              )}
            </div>

            <div className="coming-soon">
              <span className="coming-soon-label">Coming soon:</span>
              {["📱 More Languages"].map(f => (
                <span key={f} className="soon-pill">{f}</span>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        OfficeSahayek AI · Built for every Indian office worker
      </footer>
    </div>
  );
}

export default App;