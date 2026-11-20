import fs from 'fs';
import path from 'path';
import { app } from 'electron';

let logPath = null;

function ensureLog() {
  if (logPath) return logPath;
  const dir = path.join(app.getPath('userData'), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const day = new Date().toISOString().slice(0, 10);
  logPath = path.join(dir, `alif-pos-${day}.log`);
  return logPath;
}

function write(level, msg, extra) {
  try {
    const line = `[${new Date().toISOString()}] [${level}] ${msg}${extra ? ' ' + extra : ''}\n`;
    fs.appendFileSync(ensureLog(), line);
  } catch (_) {}
  if (level === 'ERROR') console.error(msg, extra || '');
  else console.log(msg, extra || '');
}

export const logger = {
  info: (m, e) => write('INFO', m, e),
  warn: (m, e) => write('WARN', m, e),
  error: (m, e) => write('ERROR', m, typeof e === 'string' ? e : (e?.stack || e?.message || String(e)))
};
