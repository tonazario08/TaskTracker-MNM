function sanitizeMeta(meta) {
  if (!meta || typeof meta !== 'object') return {};
  const clone = { ...meta };
  if (clone.headers && typeof clone.headers === 'object') {
    clone.headers = { ...clone.headers };
    delete clone.headers.cookie;
    delete clone.headers.authorization;
    delete clone.headers['x-csrf-token'];
  }
  return clone;
}

function write(level, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...sanitizeMeta(meta),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }
  console.log(line);
}

function info(message, meta) {
  write('info', message, meta);
}

function warn(message, meta) {
  write('warn', message, meta);
}

function error(message, meta) {
  write('error', message, meta);
}

module.exports = {
  info,
  warn,
  error,
};
