export interface ExplainedError {
  errorType: string;      // new
  message: string;        // short explanation
  summary?: string;       // optional, if you keep old fields
  why?: string[];
  fix?: string[];
}
