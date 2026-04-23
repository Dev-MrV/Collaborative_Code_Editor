export function runCode(
  code: string,
  onLog: (msg: string) => void,
  timeout = 2000
) {
  const workerCode = `
    self.console = {
      log: (...args) => self.postMessage({ type: "log", msg: args.join(" ") })
    };

    try {
      ${code}
      self.postMessage({ type: "done" });
    } catch (err) {
      self.postMessage({ type: "error", msg: err.message });
    }
  `;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  const worker = new Worker(URL.createObjectURL(blob));

  const timer = setTimeout(() => {
    worker.terminate();
    onLog("Error: Execution timed out ⏱️");
  }, timeout);

  worker.onmessage = (e) => {
    if (e.data.type === "log") {
      onLog(e.data.msg);
    }
    if (e.data.type === "error") {
      clearTimeout(timer);
      onLog(`Error: ${e.data.msg}`);
      worker.terminate();
    }
    if (e.data.type === "done") {
      clearTimeout(timer);
      worker.terminate();
    }
  };
}
