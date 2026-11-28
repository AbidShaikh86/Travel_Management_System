import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const envFilePath = path.join(rootDir, '.env');
const outputDirs = [
  path.join(rootDir, 'dist', 'build', 'browser'),
  path.join(rootDir, 'dist', 'build'),
];

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const result = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

const fileEnv = parseDotEnv(envFilePath);
const readVar = (name) => process.env[name] ?? fileEnv[name];

const runtimeConfig = {};
for (const key of ['API_URL', 'APP_NAME', 'ENABLE_DEBUG_LOGS']) {
  const val = readVar(key);
  if (val !== undefined && val !== '') {
    runtimeConfig[key] = val;
  }
}

const serialized =
  `(function (global) {\n` +
  `  global.__env = Object.assign({}, global.__env || {}, ${JSON.stringify(runtimeConfig, null, 2)});\n` +
  `})(typeof window !== "undefined" ? window : globalThis);\n`;

const targetDir = outputDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));
if (!targetDir) {
  console.warn('[generate-env] Build output directory with index.html not found; skipping env.js write.');
  process.exit(0);
}

const targetFile = path.join(targetDir, 'env.js');
fs.writeFileSync(targetFile, serialized, 'utf8');
console.log(`[generate-env] Wrote runtime config to ${path.relative(rootDir, targetFile)}`);
