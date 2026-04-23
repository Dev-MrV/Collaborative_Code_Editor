import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const leftGlowRef = useRef<HTMLDivElement | null>(null);
  const rightPanelRef = useRef<HTMLDivElement | null>(null);
  const rightGlowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const setupGlow = (panel: HTMLDivElement | null, glow: HTMLDivElement | null) => {
      if (!panel || !glow) return;
      const moveGlow = (e: MouseEvent) => {
        const rect = panel.getBoundingClientRect();
        glow.style.left = `${e.clientX - rect.left}px`;
        glow.style.top = `${e.clientY - rect.top}px`;
      };
      panel.addEventListener("mousemove", moveGlow);
      return () => panel.removeEventListener("mousemove", moveGlow);
    };

    const cl = setupGlow(leftPanelRef.current, leftGlowRef.current);
    const cr = setupGlow(rightPanelRef.current, rightGlowRef.current);
    return () => { cl?.(); cr?.(); };
  }, []);

  const handleStart = () => {
    const name = username.trim();
    if (!name) {
      setMessage("Please enter a username");
      return;
    }
    if (name.length < 2) {
      setMessage("Username must be at least 2 characters");
      return;
    }
    localStorage.setItem("username", name);
    window.dispatchEvent(new Event("storage"));
    navigate("/");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleStart();
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* LEFT */}
        <div className="left-panel" ref={leftPanelRef}>
          <div className="mouse-glow" ref={leftGlowRef} />
          <div className="brand-badge">⚡ CodeCollab</div>
          <div className="spacer" />
          <h1>Start Coding</h1>
          <p>"Small steps today,<br />big systems tomorrow."</p>
          <div className="left-visual">
            <div className="spacer" />
            <div className="code-preview">
              <div className="code-line-p"><span className="kw">const</span> editor = <span className="fn">createRoom</span>(<span className="str">"my-room"</span>);</div>
              <div className="code-line-p"><span className="kw">await</span> editor.<span className="fn">invite</span>(users);</div>
              <div className="code-line-p"><span className="fn">console</span>.<span className="fn">log</span>(<span className="str">"Let's build!"</span>);</div>
            </div>
          </div>
          <div className="feature-pills">
            <span className="pill">⚡ Instant Rooms</span>
            <span className="pill">🐍 Python &amp; JS</span>
            <span className="pill">🤖 AI Errors</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel" ref={rightPanelRef}>
          <div className="mouse-glow right-glow" ref={rightGlowRef} />
          <div className="auth-card">
            <div className="auth-icon">🚀</div>
            <h2>Create Account</h2>
            <p className="auth-subtitle">Pick a username to get started instantly.</p>

            <div className="input-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="e.g. Alice, Bob, Dev123"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                maxLength={24}
              />
            </div>

            <button className="primary-btn" onClick={handleStart}>
              <span>Create Account</span>
              <span className="btn-arrow">→</span>
            </button>

            {message && (
              <p className="auth-msg error">{message}</p>
            )}

            <p className="toggle-text">
              Already have a username?{" "}
              <span onClick={() => navigate("/login")}>Sign in</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}