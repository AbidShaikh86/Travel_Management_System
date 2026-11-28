export interface RuntimeEnv {
  API_URL?: string;
  APP_NAME?: string;
  ENABLE_DEBUG_LOGS?: boolean | string;
}

export function getRuntimeEnv(): RuntimeEnv {
  if (typeof globalThis !== 'undefined') {
    const env = (globalThis as { __env?: RuntimeEnv }).__env;
    if (env && typeof env === 'object') {
      return env;
    }
  }
  return {};
}

export function parseEnvBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return fallback;
}
