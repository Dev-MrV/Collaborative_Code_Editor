import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/auth.css";

export default function Login() {
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

  const handleEnter = () => {
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
    if (e.key === "Enter") handleEnter();
  };

  return (
    <div className="auth-container">
      <div className="auth-wrapper">
        {/* LEFT */}
        <div className="left-panel" ref={leftPanelRef}>
          <div className="mouse-glow" ref={leftGlowRef} />
          <div className="brand-badge">⚡ CodeCollab</div>
          <div className="spacer" />
          <h1>Welcome Back</h1>
          <p>Real-time collaborative coding.<br />No account needed — just enter your name.</p>
          <div className="left-visual">
            <div className="spacer" />
            <div className="code-preview">
              <div className="code-line-p"><span className="kw">def</span> collaborate(users):</div>
              <div className="code-line-p indent"><span className="kw">for</span> user <span className="kw">in</span> users:</div>
              <div className="code-line-p indent2">user.code_together()</div>
            </div>
          </div>
          <div className="feature-pills">
            <span className="pill">🔄 Real-time Sync</span>
            <span className="pill">🔒 Line Locking</span>
            <span className="pill">👥 Multi-user</span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="right-panel" ref={rightPanelRef}>
          <div className="mouse-glow right-glow" ref={rightGlowRef} />
          <div className="auth-card">
            <div className="auth-icon">👤</div>
            <h2>Enter the Editor</h2>
            <p className="auth-subtitle">No sign-up required. Just pick a username.</p>

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

            <button className="primary-btn" onClick={handleEnter}>
              <span>Start Coding</span>
              <span className="btn-arrow">→</span>
            </button>

            {message && (
              <p className="auth-msg error">{message}</p>
            )}

            <p className="toggle-text">
              New here?{" "}
              <span onClick={() => navigate("/signup")}>Learn more</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}