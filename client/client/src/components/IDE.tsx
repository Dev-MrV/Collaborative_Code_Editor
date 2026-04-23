import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import * as monaco from "monaco-editor";
import * as Y from "yjs";

import { runCode } from "../utils/runCode";
import { runPython } from "../utils/runPython";
import { explainErrorApi } from "../ai/errorExplainer/api";
import type { ExplainedError } from "../ai/errorExplainer/types";
import { useLocks } from "../utils/useLocks";
import CodeEditor from "./editor/CodeEditor";
import "../styles/ide.css";

/* ── helpers ───────────────────────────────────────────────── */
const getConsistentColor = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 70%, 58%)`;
};

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

const getStoredRooms = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem("recentRooms") || "[]");
  } catch {
    return [];
  }
};

const saveRoom = (roomId: string) => {
  const rooms = getStoredRooms().filter((r) => r !== roomId);
  rooms.unshift(roomId);
  localStorage.setItem("recentRooms", JSON.stringify(rooms.slice(0, 10)));
};

/* ── icons ─────────────────────────────────────────────────── */
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const OutputIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M8 12h8M12 8v8" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/* ─────────────────────────────────────────────────────────── */

const IDE: React.FC = () => {
  const navigate = useNavigate();

  /* ── auth ─────────────────────────────────────────────────── */
  const [user, setUser] = useState<string | null>(localStorage.getItem("username"));

  useEffect(() => {
    const handler = () => setUser(localStorage.getItem("username"));
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  /* ── room ─────────────────────────────────────────────────── */
  const [roomId, setRoomId] = useState<string | null>(localStorage.getItem("roomId"));
  const [roomInput, setRoomInput] = useState("");
  const [roomStatus, setRoomStatus] = useState("");
  const [recentRooms, setRecentRooms] = useState<string[]>(getStoredRooms());

  /* ── code ─────────────────────────────────────────────────── */
  const [code, setCode] = useState('print("Hello Python")');
  const [logs, setLogs] = useState<string[]>([]);
  const [language, setLanguage] = useState<"javascript" | "python">("python");
  const [isRunning, setIsRunning] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [isOutputVisible, setIsOutputVisible] = useState(true);
  const [aiError, setAiError] = useState<ExplainedError | null>(null);

  const editorContainerRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  /* ── ydoc + locks ─────────────────────────────────────────── */
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const { locks, lockLine, unlockLine } = useLocks(ydoc);

  /* ── lock UI state ────────────────────────────────────────── */
  const [showLockPanel, setShowLockPanel] = useState(false);
  const [lockFrom, setLockFrom] = useState("");
  const [lockTo, setLockTo] = useState("");

  /* ── presence ─────────────────────────────────────────────── */
  const [remoteUsers, setRemoteUsers] = useState<Array<{ id: number; name: string; color: string }>>([]);

  /* ── output width ─────────────────────────────────────────── */
  const [outputWidth, setOutputWidth] = useState(360);
  const minOutputWidth = 220;
  const minEditorWidth = 320;

  /* ── theme ────────────────────────────────────────────────── */
  useEffect(() => {
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
  }, [isDark]);

  /* ── auto scroll output ───────────────────────────────────── */
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs, aiError]);

  /* ── resizer ──────────────────────────────────────────────── */
  useEffect(() => {
    let resizing = false;
    const resizer = document.querySelector(".resizer") as HTMLElement;

    const start = () => { resizing = true; resizer?.classList.add("resizing"); };
    const stop = () => { resizing = false; resizer?.classList.remove("resizing"); };
    const move = (e: MouseEvent) => {
      if (!resizing || !editorContainerRef.current) return;
      const mainWidth = editorContainerRef.current.parentElement!.clientWidth;
      const newWidth = Math.max(minOutputWidth, Math.min(mainWidth - e.clientX, mainWidth - minEditorWidth));
      setOutputWidth(newWidth);
    };

    resizer?.addEventListener("mousedown", start);
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);

    return () => {
      resizer?.removeEventListener("mousedown", start);
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stop);
    };
  }, []);

  /* ── AI error ─────────────────────────────────────────────── */
  const handleAiError = async (message: string, currentCode: string) => {
    try {
      const res = await explainErrorApi({ language, code: currentCode, message });
      setAiError(res);
    } catch {
      setAiError({ errorType: "AIError", message: "Failed to fetch AI explanation" });
    }
  };

  /* ── run code ─────────────────────────────────────────────── */
  const handleRun = async () => {
    if (!user) return alert("Please login to run code");
    setLogs([]);
    setAiError(null);
    setIsRunning(true);
    const liveCode = monacoEditorRef.current?.getValue() ?? code;
    const onError = async (msg: string) => {
      setLogs((p) => [...p, msg]);
      if (msg.includes("Error") || msg.includes("Traceback")) {
        await handleAiError(msg, liveCode);
      }
    };
    try {
      language === "javascript"
        ? runCode(liveCode, onError)
        : await runPython(liveCode, onError);
    } finally {
      setIsRunning(false);
    }
  };

  /* ── room actions (frontend-only) ────────────────────────── */
  const handleCreateRoom = () => {
    const id = roomInput.trim();
    if (!id) { setRoomStatus("Enter a room name"); return; }
    localStorage.setItem("roomId", id);
    saveRoom(id);
    setRecentRooms(getStoredRooms());
    setRoomId(id);
    setRoomInput("");
    setRoomStatus(`Created & joined: ${id}`);
  };

  const handleJoinRoom = () => {
    const id = roomInput.trim();
    if (!id) { setRoomStatus("Enter a room name"); return; }
    localStorage.setItem("roomId", id);
    saveRoom(id);
    setRecentRooms(getStoredRooms());
    setRoomId(id);
    setRoomInput("");
    setRoomStatus(`Joined: ${id}`);
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem("roomId");
    setRoomId(null);
    setRoomStatus("Left room");
    setYdoc(null);
    setRemoteUsers([]);
  };

  /* ── logout ───────────────────────────────────────────────── */
  const handleLogout = () => {
    localStorage.clear();
    setRoomId(null);
    setUser(null);
    navigate("/login");
  };

  /* ── lock actions ─────────────────────────────────────────── */
  const handleLockLines = () => {
    if (!user || !ydoc) return;
    const from = parseInt(lockFrom);
    const to = parseInt(lockTo || lockFrom);
    if (isNaN(from)) return;
    const color = getConsistentColor(user);
    for (let l = from; l <= to; l++) {
      lockLine(l, user, color);
    }
    setLockFrom("");
    setLockTo("");
  };

  const handleUnlockLine = (line: number) => {
    if (!user) return;
    unlockLine(line, user);
  };

  /* ── status message auto-clear ────────────────────────────── */
  useEffect(() => {
    if (!roomStatus) return;
    const t = setTimeout(() => setRoomStatus(""), 4000);
    return () => clearTimeout(t);
  }, [roomStatus]);

  const userColor = user ? getConsistentColor(user) : "#7c3aed";

  /* ── UI ───────────────────────────────────────────────────── */
  return (
    <div className="ide-root">
      {/* ═══════════════════════ TOP BAR ═══════════════════════ */}
      <div className="top-bar">
        <div className="top-bar-left">
          {/* Logo */}
          <div className="logo">
            <div className="logo-icon">⚡</div>
            <span>CodeCollab</span>
          </div>

          <div className="top-bar-divider" />

          {/* Room control */}
          {user && (
            <div className="room-control">
              {roomId ? (
                <>
                  <div className={`room-badge ${roomId ? "connected" : ""}`}>
                    <span className="dot" />
                    {roomId}
                  </div>
                  <button className="icon-btn" onClick={handleLeaveRoom} title="Leave room">
                    ✕
                  </button>
                </>
              ) : (
                <>
                  <input
                    className="room-input"
                    placeholder="Room name…"
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                    list="recent-rooms"
                  />
                  <datalist id="recent-rooms">
                    {recentRooms.map((r) => <option key={r} value={r} />)}
                  </datalist>
                  <button className="icon-btn" onClick={handleCreateRoom}>+ Create</button>
                  <button className="icon-btn" onClick={handleJoinRoom}>→ Join</button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Center: language + run ── */}
        <div className="top-bar-center">
          <select
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "javascript" | "python")}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>

          <button className="run-btn" onClick={handleRun} disabled={isRunning}>
            {isRunning ? (
              <>
                <span className="spinner" />
                Running…
              </>
            ) : (
              <>
                <PlayIcon />
                Run
              </>
            )}
          </button>
        </div>

        {/* ── Right: presence + controls ── */}
        <div className="top-bar-right">
          {/* Remote users presence */}
          {remoteUsers.length > 0 && (
            <div className="presence-cluster">
              {remoteUsers.map((u) => (
                <div
                  key={u.id}
                  className="presence-avatar"
                  style={{ backgroundColor: u.color }}
                  title={u.name}
                >
                  {getInitials(u.name)}
                  <span className="presence-tooltip">{u.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current user */}
          {user && (
            <div className="user-greeting">
              <div className="user-avatar" style={{ backgroundColor: userColor }}>
                {getInitials(user)}
              </div>
              <span>{user}</span>
            </div>
          )}

          <div className="top-bar-divider" />

          {/* Lock toggle */}
          {roomId && ydoc && (
            <button
              className={`icon-btn ${showLockPanel ? "active" : ""}`}
              onClick={() => setShowLockPanel((v) => !v)}
              title="Lock lines"
            >
              <LockIcon />
              Lock
            </button>
          )}

          {/* Output toggle */}
          <button
            className={`icon-btn ${isOutputVisible ? "active" : ""}`}
            onClick={() => setIsOutputVisible((v) => !v)}
            title="Toggle output"
          >
            <OutputIcon />
          </button>

          {/* Theme toggle */}
          <button className="icon-btn" onClick={() => setIsDark((v) => !v)} title="Toggle theme">
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Auth buttons */}
          {user ? (
            <button className="icon-btn" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </button>
          ) : (
            <>
              <button className="icon-btn" onClick={() => navigate("/login")}>Login</button>
              <button className="icon-btn" onClick={() => navigate("/signup")}>Sign up</button>
            </>
          )}
        </div>
      </div>

      {/* ═══════════════════════ LOCK PANEL ════════════════════ */}
      {showLockPanel && roomId && ydoc && (
        <div className="lock-panel">
          <span className="lock-panel-label">🔒 Lock lines:</span>
          <input
            className="lock-range-input"
            placeholder="From"
            type="number"
            min={1}
            value={lockFrom}
            onChange={(e) => setLockFrom(e.target.value)}
          />
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>–</span>
          <input
            className="lock-range-input"
            placeholder="To"
            type="number"
            min={1}
            value={lockTo}
            onChange={(e) => setLockTo(e.target.value)}
          />
          <button className="lock-btn" onClick={handleLockLines}>Lock</button>

          {locks.size > 0 && (
            <>
              <span className="lock-panel-label" style={{ marginLeft: 8 }}>Active locks:</span>
              <div className="lock-list">
                {Array.from(locks.entries()).map(([line, entry]) => (
                  <div
                    key={line}
                    className="lock-tag"
                    title={`Locked by ${entry.username}. Click to unlock (if yours)`}
                    onClick={() => handleUnlockLine(Number(line))}
                  >
                    🔒 L{line} — {entry.username}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════ MAIN ══════════════════════════ */}
      <div className="main-container">
        {/* Editor */}
        <div
          className="editor-container"
          ref={editorContainerRef}
          style={{
            width: isOutputVisible ? `calc(100% - ${outputWidth + 5}px)` : "100%",
          }}
        >
          <CodeEditor
            code={roomId ? undefined : code}
            setCode={roomId ? undefined : setCode}
            language={language}
            theme={isDark ? "vs-dark" : "light"}
            roomName={roomId || undefined}
            currentUsername={user || undefined}
            locks={locks}
            onEditorReady={(editor) => { monacoEditorRef.current = editor; }}
            onYdocReady={(doc) => setYdoc(doc)}
            onRemoteUsersChange={setRemoteUsers}
          />
        </div>

        {/* Resizer */}
        {isOutputVisible && <div className="resizer" />}

        {/* Output panel */}
        {isOutputVisible && (
          <div className="output-container" style={{ width: outputWidth }}>
            <div className="output-header">
              <div className="output-title">
                <div className={`output-title-dot ${logs.some(l => l.includes("Error")) ? "error" : ""}`} />
                Output
              </div>
              <button className="output-clear-btn" onClick={() => { setLogs([]); setAiError(null); }}>
                Clear
              </button>
            </div>

            <div
              className={`output-box ${logs.length === 0 && !aiError ? "empty" : ""}`}
              ref={outputRef}
            >
              {logs.length > 0
                ? logs.map((l, i) => <div key={i}>{l}</div>)
                : !aiError && "▶ Run code to see output here"}
            </div>

            {aiError && (
              <div className="ai-error-panel">
                <strong>🤖 {aiError.errorType}</strong>
                {aiError.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════ STATUS BAR ════════════════════ */}
      <div className="status-bar">
        <span>
          {roomId ? `🟢 Room: ${roomId}` : "⚪ No room — edits are local only"}
        </span>
        {roomStatus && (
          <>
            <span>·</span>
            <span>{roomStatus}</span>
          </>
        )}
        {locks.size > 0 && (
          <>
            <span>·</span>
            <span>🔒 {locks.size} line{locks.size > 1 ? "s" : ""} locked</span>
          </>
        )}
        <span style={{ marginLeft: "auto" }}>{language === "python" ? "🐍 Python" : "⚡ JavaScript"}</span>
      </div>
    </div>
  );
};

export default IDE;
