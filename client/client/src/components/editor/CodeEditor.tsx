import React, { useEffect, useRef, useState, Dispatch, SetStateAction, useCallback } from "react";
import * as monaco from "monaco-editor";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import type { LocksMap, LockEntry } from "../../utils/useLocks";

interface CodeEditorProps {
  code?: string;
  setCode?: Dispatch<SetStateAction<string>>;
  language: string;
  theme: "vs-dark" | "light" | string;
  roomName?: string;
  onEditorReady?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onYdocReady?: (ydoc: Y.Doc) => void;
  onRemoteUsersChange?: (users: Array<{ id: number; name: string; color: string }>) => void;
  locks?: LocksMap;
  currentUsername?: string;
}

type SimpleCompletionItem = Omit<monaco.languages.CompletionItem, "range">;

const jsCompletionItems: SimpleCompletionItem[] = [
  {
    label: "function",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "function ${1:name}(${2:params}) {\n\t$0\n}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Create a JavaScript function",
  },
  {
    label: "console.log",
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: "console.log($1);",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Log output to the console",
  },
  {
    label: "const",
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: "const ${1:name} = ${2:value};",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Declare a constant",
  },
  {
    label: "let",
    kind: monaco.languages.CompletionItemKind.Keyword,
    insertText: "let ${1:name} = ${2:value};",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Declare a block-scoped variable",
  },
  {
    label: "for",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "for (let ${1:i} = 0; ${1:i} < ${2:array}.length; ${1:i}++) {\n\t$0\n}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Create a for loop",
  },
];

const pythonCompletionItems: SimpleCompletionItem[] = [
  {
    label: "def",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "def ${1:func_name}(${2:args}):\n\t$0",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Define a Python function",
  },
  {
    label: "print",
    kind: monaco.languages.CompletionItemKind.Function,
    insertText: "print(${1:message})",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Print a message to standard output",
  },
  {
    label: "for",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "for ${1:item} in ${2:iterable}:\n\t$0",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Create a for loop",
  },
  {
    label: "if",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "if ${1:condition}:\n\t$0",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Create an if statement",
  },
  {
    label: "class",
    kind: monaco.languages.CompletionItemKind.Snippet,
    insertText: "class ${1:ClassName}:\n\tdef __init__(self, ${2:args}):\n\t\t$0",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    documentation: "Define a Python class",
  },
];

const createCompletionProvider = (language: string, suggestions: SimpleCompletionItem[]) => {
  return monaco.languages.registerCompletionItemProvider(language, {
    triggerCharacters: [".", " ", ":"],
    provideCompletionItems: (model, position) => {
      const wordUntil = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordUntil.startColumn,
        endColumn: wordUntil.endColumn,
      };
      return { suggestions: suggestions.map((item) => ({ ...item, range })) };
    },
  });
};

const getConsistentColor = (input: string) => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 58%)`;
};

const ensureCursorStyle = (clientId: number, color: string) => {
  const styleId = `remote-cursor-style-${clientId}`;
  if (document.getElementById(styleId)) return;

  const styleEl = document.createElement("style");
  styleEl.id = styleId;
  styleEl.textContent = `
    .remote-cursor-${clientId} {
      border-left-color: ${color} !important;
    }
    .remote-cursor-label-${clientId} {
      background: ${color} !important;
    }
    .remote-selection-${clientId} {
      background: ${color}28 !important;
    }
  `;
  document.head.appendChild(styleEl);
};

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  language,
  theme,
  roomName,
  onEditorReady,
  onYdocReady,
  onRemoteUsersChange,
  locks,
  currentUsername,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const lockDecorationsRef = useRef<string[]>([]);
  const locksRef = useRef<LocksMap | undefined>(locks);

  // ─── Apply lock decorations whenever locks change ───────────────────────
  useEffect(() => {
    locksRef.current = locks;
    const editor = monacoEditorRef.current;
    if (!editor || !locks) return;

    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];

    locks.forEach((entry: LockEntry, lineStr: string) => {
      const line = Number(lineStr);
      if (isNaN(line)) return;
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: "locked-line-decoration",
          linesDecorationsClassName: "locked-line-gutter",
          hoverMessage: {
            value: `🔒 Locked by **${entry.username}**`,
          },
        },
      });
    });

    lockDecorationsRef.current = editor.deltaDecorations(
      lockDecorationsRef.current,
      newDecorations
    );
  }, [locks]);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = monaco.editor.create(editorRef.current, {
      value: roomName ? "" : code || "",
      language: language === "python" ? "python" : "javascript",
      theme: theme === "vs-dark" ? "vs-dark" : "vs-light",
      automaticLayout: true,
      minimap: { enabled: true },
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Consolas', monospace",
      fontLigatures: true,
      lineHeight: 22,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      renderLineHighlight: "all",
      padding: { top: 10, bottom: 10 },
      glyphMargin: true,
    });

    monacoEditorRef.current = editor;
    onEditorReady?.(editor);

    // NON-COLLAB MODE
    if (!roomName) {
      const disposable = editor.onDidChangeModelContent(() => {
        setCode?.(editor.getValue());
      });
      return () => {
        disposable.dispose();
        editor.dispose();
      };
    }

    // ─── COLLAB MODE ────────────────────────────────────────────────────
    const ydoc = new Y.Doc();
    onYdocReady?.(ydoc);

    const provider = new WebsocketProvider("ws://localhost:1234", roomName!, ydoc);

    const yText = ydoc.getText("monaco");
    const binding = new MonacoBinding(yText, editor.getModel()!, new Set([editor]), provider.awareness);

    // Assign user info
    const username = currentUsername || localStorage.getItem("username") || "Anonymous";
    const clientId = provider.awareness.clientID;
    const userColor = getConsistentColor(`${username}-${clientId}`);

    provider.awareness.setLocalStateField("user", { name: username, color: userColor, clientId });
    provider.awareness.setLocalStateField("cursor", null);
    provider.awareness.setLocalStateField("selection", null);

    // Decorations maps
    const cursorDecorations = new Map<number, string[]>();
    const selectionDecorations = new Map<number, string[]>();

    // ─── Throttle awareness cursor updates (RAF-based) ──────────────────
    let rafId: number | null = null;
    let pendingCursor: { lineNumber: number; column: number } | null = null;
    let pendingSelection: { startLine: number; startCol: number; endLine: number; endCol: number } | null = null;

    const flushAwareness = () => {
      if (pendingCursor) {
        provider.awareness.setLocalStateField("cursor", pendingCursor);
        pendingCursor = null;
      }
      if (pendingSelection) {
        provider.awareness.setLocalStateField("selection", pendingSelection);
        pendingSelection = null;
      }
      rafId = null;
    };

    const scheduleFlush = () => {
      if (rafId == null) rafId = requestAnimationFrame(flushAwareness);
    };

    // Track cursor position
    const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
      pendingCursor = { lineNumber: e.position.lineNumber, column: e.position.column };
      scheduleFlush();
    });

    // Track selection
    const selectionDisposable = editor.onDidChangeCursorSelection((e) => {
      const sel = e.selection;
      pendingSelection = {
        startLine: sel.startLineNumber,
        startCol: sel.startColumn,
        endLine: sel.endLineNumber,
        endCol: sel.endColumn,
      };
      scheduleFlush();
    });

    // ─── Block editing on locked lines ──────────────────────────────────
    let isRemoteEdit = false;
    const beforeTx = (tr: Y.Transaction) => { if (!tr.local) isRemoteEdit = true; };
    const afterTx = () => { isRemoteEdit = false; };
    ydoc.on("beforeTransaction", beforeTx);
    ydoc.on("afterTransaction", afterTx);

    const contentDisposable = editor.onDidChangeModelContent((e) => {
      if (isRemoteEdit) return; // Ignore remote syncs
      const currentLocks = locksRef.current;
      if (!currentLocks || currentLocks.size === 0) return;

      let isViolatingLock = false;
      for (const change of e.changes) {
        const start = change.range.startLineNumber;
        const end = Math.max(change.range.endLineNumber, start + change.text.split("\n").length - 1);
        
        for (let l = start; l <= end; l++) {
          const lockEntry = currentLocks.get(String(l));
          if (lockEntry && lockEntry.username !== username) {
            isViolatingLock = true;
            break;
          }
        }
        if (isViolatingLock) break;
      }

      if (isViolatingLock) {
        // Revert async to prevent event loop issues
        setTimeout(() => editor.trigger("lock", "undo", null), 0);
      }
    });

    // ─── Native Editor Read-Only enforcement ────────────────────────────
    const checkReadOnly = () => {
      const currentLocks = locksRef.current;
      if (!currentLocks) return;
      const selections = editor.getSelections();
      let shouldLock = false;
      if (selections) {
        for (const sel of selections) {
          for (let l = sel.startLineNumber; l <= sel.endLineNumber; l++) {
            const entry = currentLocks.get(String(l));
            if (entry && entry.username !== username) {
              shouldLock = true;
              break;
            }
          }
          if (shouldLock) break;
        }
      }
      editor.updateOptions({ 
        readOnly: shouldLock, 
        readOnlyMessage: { value: "🔒 Line locked by another user" } 
      });
    };

    const cursLockDisp = editor.onDidChangeCursorSelection(checkReadOnly);


    // ─── Render remote cursors & selections ─────────────────────────────
    const awarenessHandler = () => {
      const states = provider.awareness.getStates();
      const users: Array<{ id: number; name: string; color: string }> = [];

      states.forEach((state, cId) => {
        if (cId === provider.awareness.clientID) return;
        if (!state.user) return;

        users.push({ id: cId, name: state.user.name, color: state.user.color });

        const { name, color } = state.user;
        const labelClass = `remote-cursor-label-${cId}`;
        const cursorClass = `remote-cursor-${cId}`;
        const selClass = `remote-selection-${cId}`;

        ensureCursorStyle(cId, color);

        // Cursor decoration
        if (state.cursor) {
          const { lineNumber, column } = state.cursor;
          const newCursorDec = editor.deltaDecorations(
            cursorDecorations.get(cId) || [],
            [
              {
                range: new monaco.Range(lineNumber, column, lineNumber, column),
                options: {
                  className: `remote-cursor ${cursorClass}`,
                  after: {
                    content: ` ${name}`,
                    inlineClassName: `remote-cursor-label ${labelClass}`,
                    inlineClassNameAffectsLetterSpacing: true,
                  },
                },
              },
            ]
          );
          cursorDecorations.set(cId, newCursorDec);
        }

        // Selection highlight decoration
        if (state.selection) {
          const { startLine, startCol, endLine, endCol } = state.selection;
          const isTrivial = startLine === endLine && startCol === endCol;
          const newSelDec = editor.deltaDecorations(
            selectionDecorations.get(cId) || [],
            isTrivial
              ? []
              : [
                  {
                    range: new monaco.Range(startLine, startCol, endLine, endCol),
                    options: {
                      className: `remote-selection ${selClass}`,
                    },
                  },
                ]
          );
          selectionDecorations.set(cId, newSelDec);
        }
      });

      onRemoteUsersChange?.(users);
    };

    provider.awareness.on("change", awarenessHandler);
    awarenessHandler();

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
      ydoc.off("beforeTransaction", beforeTx);
      ydoc.off("afterTransaction", afterTx);
      cursLockDisp.dispose();
      selectionDisposable.dispose();
      contentDisposable.dispose();
      editor.dispose();
    };
  }, [roomName]);

  // Theme update
  useEffect(() => {
    if (monacoEditorRef.current) {
      monaco.editor.setTheme(theme === "vs-dark" ? "vs-dark" : "vs-light");
    }
  }, [theme]);

  // Language update — update autocomplete provider
  useEffect(() => {
    if (!monacoEditorRef.current) return;
    const provider = createCompletionProvider(
      language === "python" ? "python" : "javascript",
      language === "python" ? pythonCompletionItems : jsCompletionItems
    );
    return () => provider.dispose();
  }, [language]);

  // Language model update
  useEffect(() => {
    const model = monacoEditorRef.current?.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language === "python" ? "python" : "javascript");
    }
  }, [language]);

  return (
    <div className="editor-wrapper">
      <div ref={editorRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
};

export default CodeEditor;
