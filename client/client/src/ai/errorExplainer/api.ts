import type { ExplainedError } from "./types";

export async function explainErrorApi({
  language,
  code,
  message,
}: {
  language: string;
  code: string;
  message: string;
}): Promise<ExplainedError> {
  const res = await fetch("http://localhost:5000/api/explain-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ language, code, message }),
  });

  if (!res.ok) throw new Error("Failed to fetch AI explanation");
  return res.json();
}
