let pyodide: any = null;

export async function runPython(
  code: string,
  onLog: (msg: string) => void
) {
  try {
    if (!(window as any).loadPyodide) {
      onLog("❌ Pyodide not loaded");
      return;
    }

    if (!pyodide) {
      pyodide = await (window as any).loadPyodide({
        stdout: (msg: string) => onLog(msg),
        stderr: (msg: string) => onLog(msg),
      });
    }

    // ✅ FORCE proper newlines
    const safeCode = code.replace(/\r\n/g, "\n");

    await pyodide.runPythonAsync(safeCode);
  } catch (err: any) {
    onLog(`❌ ${err.message}`);
  }
}
