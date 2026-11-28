import { getRuntimeEnv, parseEnvBoolean } from './runtime-env';

const runtime = getRuntimeEnv();

export const environment = {
  production: true,
  apiUrl: runtime.API_URL?.trim() || '/api',
  appName: runtime.APP_NAME?.trim() || 'TravelDesk',
  enableDebugLogs: parseEnvBoolean(runtime.ENABLE_DEBUG_LOGS, false),
};
