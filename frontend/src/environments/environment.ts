import { getRuntimeEnv, parseEnvBoolean } from './runtime-env';

const runtime = getRuntimeEnv();

export const environment = {
  production: false,
  apiUrl: runtime.API_URL?.trim() || 'http://localhost:6969/api',
  appName: runtime.APP_NAME?.trim() || 'TravelDesk',
  enableDebugLogs: parseEnvBoolean(runtime.ENABLE_DEBUG_LOGS, true),
};
