import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { API } from "../config";
export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields"); return; }
    if (mode === "register" && !form.name) { setError("Please enter your name"); return; }
    if (mode === "register" && form.password.length < 6) { setError("Password must be at least 6 characters"); return; }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login"
        ? { email: form.email, password: form.password }
        : { email: form.email, name: form.name, password: form.password };

      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
      navigate("/");
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 401) setError("Invalid email or password");
      else if (status === 400) setError(detail || "Invalid input");
      else if (err.code === "ERR_NETWORK") setError("Cannot connect to server");
      else setError(detail || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F4F6FB",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "1rem", fontFamily: "'Noto Sans', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <div style={{
          width: 48, height: 48, background: "#E07B39", color: "#fff",
          borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.1rem", fontWeight: 700,
        }}>OS</div>
        <div>
          <h1 style={{ fontSize: "1.5rem", color: "#1B2E4E", fontFamily: "'Playfair Display', serif" }}>OfficeSahayek AI</h1>
          <p style={{ fontSize: "0.75rem", color: "#718096", textTransform: "uppercase", letterSpacing: "0.08em" }}>Document Assistant</p>
        </div>
      </div>

      {/* Card */}
      <div style={{
        background: "#fff", border: "1px solid #DDE3EE", borderRadius: 16,
        padding: "2rem", width: "100%", maxWidth: 400, boxShadow: "0 4px 18px rgba(27,46,78,0.11)",
      }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", background: "#EDF1F7", borderRadius: 8, padding: 4, marginBottom: "1.5rem" }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1, padding: "0.5rem", borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "'Noto Sans', sans-serif", fontSize: "0.88rem", fontWeight: 600,
                background: mode === m ? "#1B2E4E" : "transparent",
                color: mode === m ? "#fff" : "#4A5568",
                transition: "all 0.2s",
              }}>
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <h2 style={{ fontSize: "1.15rem", color: "#1B2E4E", marginBottom: "1.25rem", fontFamily: "'Playfair Display', serif" }}>
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>

        {mode === "register" && (
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#2D4A70", marginBottom: 4 }}>Full Name</label>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              placeholder="Your name"
              style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #DDE3EE", borderRadius: 8,
                fontSize: "0.9rem", fontFamily: "'Noto Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#2D4A70", marginBottom: 4 }}>Email</label>
          <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #DDE3EE", borderRadius: 8,
              fontSize: "0.9rem", fontFamily: "'Noto Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#2D4A70", marginBottom: 4 }}>Password</label>
          <input type="password" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))}
            placeholder={mode === "register" ? "Minimum 6 characters" : "Your password"}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ width: "100%", padding: "0.6rem 0.85rem", border: "1px solid #DDE3EE", borderRadius: 8,
              fontSize: "0.9rem", fontFamily: "'Noto Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
        </div>

        {error && (
          <div style={{ background: "#FDECEA", border: "1px solid #F5B7B1", borderRadius: 8,
            padding: "0.65rem 0.9rem", fontSize: "0.85rem", color: "#C0392B", marginBottom: "1rem" }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{
            width: "100%", padding: "0.75rem", background: loading ? "#aaa" : "#E07B39",
            color: "#fff", border: "none", borderRadius: 10, fontSize: "0.95rem", fontWeight: 600,
            fontFamily: "'Noto Sans', sans-serif", cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
          }}>
          {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.78rem", color: "#718096" }}>
        OfficeSahayek AI · Built for every Indian office worker
      </p>
    </div>
  );
}