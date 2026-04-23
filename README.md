# 🚀 Real-Time Collaborative Code Editor (Monaco + Yjs)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-%238E75B2.svg?style=for-the-badge&logo=google&logoColor=white)

---

## 📌 Overview

A **real-time collaborative code editor** built with **Monaco Editor + Yjs**, enabling multiple users to edit the same document simultaneously with a seamless, Google Docs–like experience.

---

## ✨ Features

### 👨‍💻 Real-Time Collaboration

* Multiple users editing simultaneously
* Instant sync using **Yjs CRDT**
* No merge conflicts or overwrites

### 🎯 Live Cursor Awareness

* View other users' cursors in real time
* Unique color + identity per user

### 🔒 Line Locking System

* Lock specific lines or functions
* Prevent concurrent edits in critical sections
* Visual indicators for locked regions

### 🧠 AI Error Explanation

* Detect runtime/compile errors
* Human-readable explanations for debugging

### ⚡ Code Execution

* **JavaScript** → runs directly in browser
* **Python** → powered by Pyodide

### 🎨 UI/UX

* Monaco Editor (VS Code-like experience)
* Dark/Light theme toggle
* Resizable output panel

### 🏠 Room-Based Collaboration

* Create/join rooms instantly
* In-memory session handling (no database required)

---

## 🖼️ Screenshots

### 🧑‍🤝‍🧑 Collaborative Editing

![Collaboration](./screenshots/collab.png)

### 🎯 Cursor Awareness

![Cursor](./screenshots/cursor.png)

### 🧠 AI Error Explanation

![AI Error](./screenshots/error.png)

### 🖥️ Editor UI

![Editor](./screenshots/editor.png)

---

## 🛠️ Tech Stack

| Category       | Technology         |
| -------------- | ------------------ |
| Frontend       | React + TypeScript |
| Editor         | Monaco Editor      |
| Collaboration  | Yjs + y-websocket  |
| Realtime       | WebSocket          |
| Python Runtime | Pyodide            |
| Styling        | CSS                |

---

## ⚙️ Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/Dev-MrV/Collaborative_Code_Editor

cd Collaborative_Code_Editor
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Start Yjs WebSocket Server

```bash
npx y-websocket --port 1234
```

### 4️⃣ Run Frontend

```bash
npm run dev
```

---

## 🌐 Usage

1. Open the app in two browsers/devices
2. Enter the same Room ID
3. Start coding

### ✨ You’ll see:

* ⚡ Live sync
* 👥 Other user cursors
* 🔄 Real-time updates
* 🔒 Line locking

---

## 🔒 Line Locking (Concept)

```ts
lockRange(startLine: number, endLine: number, userId: string)
```

### How it works:

* User selects lines
* Locks them
* Other users cannot edit locked region

---

## 🧠 AI Error Handling Example

### Error

```bash
SyntaxError: invalid syntax
```

### AI Explanation

> "You may have missed a colon or used incorrect syntax..."

---

## 📂 Project Structure

```
src/
├── components/
│   ├── IDE.tsx
│   ├── editor/
│   │   └── CodeEditor.tsx
├── utils/
│   ├── runCode.ts
│   ├── runPython.ts
├── ai/
│   └── errorExplainer/
├── styles/
```

---

## 🚀 Future Improvements

* 🔐 Authentication system
* ☁️ Cloud save (Firebase / Supabase)
* 📁 Multi-file support
* 💬 Chat inside room
* 📊 Version history (time travel)
* 🎥 Screen sharing

---

## 🤝 Contributing

Contributions are welcome!

```
fork → clone → commit → push → PR
```

---

## 📜 License

This project is licensed under the **MIT License**

---

## 💡 Author

**Mr V**
💻 AI Enthusiast
📱 App Developer

---

## ⭐ Support

If you like this project:

* ⭐ Star this repo
* 🍴 Fork it
* 📢 Share with others

---

## 🧪 Example Workflow

```bash
# Start server
npx y-websocket --port 1234

# Run frontend
npm run dev
```

Open two tabs → join same room → start collaborating 🚀

---

## 🧩 Core Concepts

### 🔁 CRDT (Conflict-free Replicated Data Types)

Used by Yjs to ensure:

* No conflicts
* Automatic merging
* Offline support (future-ready)

### 🔌 WebSocket Sync

* Maintains real-time connection between clients
* Broadcasts updates instantly

---

## 🎯 Why This Project?

* Learn real-time systems
* Understand CRDTs in practice
* Build Google Docs–like experiences
* Explore browser-based code execution

---
