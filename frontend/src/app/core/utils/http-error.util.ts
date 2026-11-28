import { HttpErrorResponse } from "@angular/common/http";
import { environment } from "../../../environments/environment";

/**
 * Returns true when the HTTP error indicates the backend server is unreachable
 * (network failure / connection refused -> status 0, or gateway/unavailable 502-504).
 */
export function isBackendOfflineError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const status = (err as { status?: unknown }).status;
  return status === 0 || status === 502 || status === 503 || status === 504;
}

/**
 * Extracts a concise user-facing error message from an Angular HttpErrorResponse.
 */
export function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (isBackendOfflineError(err)) {
    return `Backend server is offline (${environment.apiUrl} unreachable).`;
  }
  if (err instanceof HttpErrorResponse || (err && typeof err === "object")) {
    const e = err as { error?: any; message?: string; status?: number };
    const bodyMsg =
      typeof e.error === "string"
        ? e.error.trim()
        : e.error?.message || e.error?.error;
    if (bodyMsg) return String(bodyMsg);
    if (e.status) return `Request failed (HTTP ${e.status}).`;
  }
  return fallback;
}
