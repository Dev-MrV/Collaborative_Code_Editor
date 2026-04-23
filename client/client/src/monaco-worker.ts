// Monaco worker fix for Vite
self.MonacoEnvironment = {
  getWorker(_: string, label: string) {
    if (label === "json") {
      return new Worker(
        new URL("monaco-editor/esm/vs/language/json/json.worker", import.meta.url),
        { type: "module" }
      );
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new Worker(
        new URL("monaco-editor/esm/vs/language/css/css.worker", import.meta.url),
        { type: "module" }
      );
    }
    if (label === "html") {
      return new Worker(
        new URL("monaco-editor/esm/vs/language/html/html.worker", import.meta.url),
        { type: "module" }
      );
    }
    if (label === "typescript" || label === "javascript") {
      return new Worker(
        new URL(
          "monaco-editor/esm/vs/language/typescript/ts.worker",
          import.meta.url
        ),
        { type: "module" }
      );
    }
    return new Worker(
      new URL("monaco-editor/esm/vs/editor/editor.worker", import.meta.url),
      { type: "module" }
    );
  },
};
