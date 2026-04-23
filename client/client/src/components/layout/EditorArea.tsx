import { useState } from "react";
import CodeEditor from "../editor/CodeEditor";

export default function EditorArea() {
  const [code, setCode] = useState("// Welcome to Collaborative IDE\nconsole.log('Hello World');");

  return (
    <div className="flex-1 min-h-0">
      <CodeEditor code={code} setCode={setCode} language="javascript" theme="vs-dark" />
    </div>
  );
}