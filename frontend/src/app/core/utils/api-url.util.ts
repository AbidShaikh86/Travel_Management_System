import { environment } from "../../../environments/environment";

/**
 * Returns the configured API base URL without a trailing slash.
 */
export function getApiBaseUrl(): string {
  return environment.apiUrl.replace(/\/+$/, "");
}

/**
 * Returns the backend origin (API base URL without the trailing `/api` suffix)
 * so server-relative paths like `/api/files/...` resolve cleanly in both
 * direct-origin (`http://localhost:6969/api`) and reverse-proxy (`/api`) setups.
 */
export function getApiOrigin(): string {
  return getApiBaseUrl().replace(/\/api$/i, "");
}

/**
 * Resolves a stored receipt/proof filename or path into a fetchable URL.
 */
export function resolveReceiptFileUrl(claimId: number | string, path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  const origin = getApiOrigin();
  if (trimmed.startsWith("/api/files/")) {
    return `${origin}${trimmed}`;
  }
  if (trimmed.startsWith("api/files/")) {
    return `${origin}/${trimmed}`;
  }
  return `${getApiBaseUrl()}/files/${claimId}/${trimmed.replace(/^\/+/, "")}`;
}
