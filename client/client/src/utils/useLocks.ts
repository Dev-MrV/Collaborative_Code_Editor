import { useEffect, useState, useCallback } from "react";
import * as Y from "yjs";

export interface LockEntry {
  username: string;
  color: string;
}

/** Maps line number (1-indexed string) → LockEntry */
export type LocksMap = Map<string, LockEntry>;

export function useLocks(ydoc: Y.Doc | null) {
  const [locks, setLocks] = useState<LocksMap>(new Map());

  useEffect(() => {
    if (!ydoc) return;

    const yLocks = ydoc.getMap<LockEntry>("line-locks");

    const sync = () => {
      const next = new Map<string, LockEntry>();
      yLocks.forEach((val, key) => next.set(key, val));
      setLocks(next);
    };

    yLocks.observe(sync);
    sync(); // initial

    return () => yLocks.unobserve(sync);
  }, [ydoc]);

  const lockLine = useCallback(
    (line: number, username: string, color: string) => {
      if (!ydoc) return;
      const yLocks = ydoc.getMap<LockEntry>("line-locks");
      yLocks.set(String(line), { username, color });
    },
    [ydoc]
  );

  const unlockLine = useCallback(
    (line: number, username: string) => {
      if (!ydoc) return;
      const yLocks = ydoc.getMap<LockEntry>("line-locks");
      const existing = yLocks.get(String(line));
      // Only the owner can unlock
      if (existing && existing.username === username) {
        yLocks.delete(String(line));
      }
    },
    [ydoc]
  );

  const isLineLocked = useCallback(
    (line: number) => locks.has(String(line)),
    [locks]
  );

  const isLockedByMe = useCallback(
    (line: number, username: string) => {
      const e = locks.get(String(line));
      return e?.username === username;
    },
    [locks]
  );

  return { locks, lockLine, unlockLine, isLineLocked, isLockedByMe };
}
