/**
 * Yjs WebSocket Server
 * Uses y-websocket's built-in binary via npm scripts,
 * falling back to a custom ws implementation for Node v22+.
 *
 * Compatible with y-websocket 1.5.x installed in this project.
 */

import http from "http";
import { WebSocketServer } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as map from "lib0/map";

const PORT = 1234;

// ── Message types (y-websocket protocol) ──────────────────
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

// ── Doc store (per room) ──────────────────────────────────
const docs = new Map();

const getDoc = (roomName) => {
  return map.setIfUndefined(docs, roomName, () => {
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    awareness.on("update", ({ added, updated, removed }, conn) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const buf = encoding.toUint8Array(encoder);

      const room = docs.get(roomName);
      if (room) {
        room.conns.forEach((_, c) => {
          if (c !== conn && c.readyState === 1 /* OPEN */) {
            c.send(buf);
          }
        });
      }
    });

    return { doc: ydoc, awareness, conns: new Map() };
  });
};

// ── Send sync step 1 ──────────────────────────────────────
const sendSyncStep1 = (ws, doc) => {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));
};

// ── Broadcast update to all peers ─────────────────────────
const broadcastUpdate = (roomName, update, origin) => {
  const room = docs.get(roomName);
  if (!room) return;

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  const buf = encoding.toUint8Array(encoder);

  room.conns.forEach((_, c) => {
    if (c !== origin && c.readyState === 1) {
      c.send(buf);
    }
  });
};

// ── Handle incoming message ───────────────────────────────
const handleMessage = (ws, roomName, message) => {
  const room = docs.get(roomName);
  if (!room) return;

  const { doc, awareness } = room;
  const decoder = decoding.createDecoder(new Uint8Array(message));
  const encoder = encoding.createEncoder();
  const msgType = decoding.readVarUint(decoder);

  switch (msgType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      const syncMsgType = syncProtocol.readSyncMessage(decoder, encoder, doc, ws);

      if (syncMsgType === syncProtocol.messageYjsSyncStep2 && !room.conns.get(ws)) {
        // New client — send pending awareness states
        if (awareness.getStates().size > 0) {
          const awarenessEncoder = encoding.createEncoder();
          encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
          encoding.writeVarUint8Array(
            awarenessEncoder,
            awarenessProtocol.encodeAwarenessUpdate(awareness, [
              ...awareness.getStates().keys(),
            ])
          );
          ws.send(encoding.toUint8Array(awarenessEncoder));
        }
      }

      if (encoding.length(encoder) > 1) {
        ws.send(encoding.toUint8Array(encoder));
      }
      break;
    }

    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        awareness,
        decoding.readVarUint8Array(decoder),
        ws
      );
      break;
    }
  }
};

// ── HTTP + WebSocket server ───────────────────────────────
const server = http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Yjs WebSocket Server running");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  // Extract room name from URL path (e.g., ws://localhost:1234/my-room)
  const roomName = decodeURIComponent(
    (req.url || "/default").replace(/^\//, "") || "default"
  );

  const { doc, awareness, conns } = getDoc(roomName);

  // Register connection
  conns.set(ws, new Set());

  console.log(`✅ Client connected → room: "${roomName}" (${conns.size} total)`);

  // Welcome: send sync step 1
  sendSyncStep1(ws, doc);

  // Send current awareness
  if (awareness.getStates().size > 0) {
    const aEncoder = encoding.createEncoder();
    encoding.writeVarUint(aEncoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      aEncoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, [...awareness.getStates().keys()])
    );
    ws.send(encoding.toUint8Array(aEncoder));
  }

  // Subscribe to doc updates and broadcast
  const docUpdateHandler = (update, origin) => {
    broadcastUpdate(roomName, update, origin === ws ? ws : null);
  };
  doc.on("update", docUpdateHandler);

  ws.on("message", (message) => {
    handleMessage(ws, roomName, message);
  });

  ws.on("close", () => {
    const clientIds = conns.get(ws);
    conns.delete(ws);
    doc.off("update", docUpdateHandler);

    // Clean up awareness for disconnected client
    if (clientIds && clientIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(awareness, [...clientIds], null);
    }

    console.log(`🔴 Client disconnected ← room: "${roomName}" (${conns.size} remaining)`);

    // Clean up empty rooms
    if (conns.size === 0) {
      docs.delete(roomName);
      console.log(`🗑  Room "${roomName}" cleared`);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Yjs WebSocket server  →  ws://localhost:${PORT}`);
  console.log(`   Rooms are created automatically on first connection.`);
});
