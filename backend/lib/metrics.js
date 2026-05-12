const requestCounters = new Map();
const durationTotals = new Map();

function keyFor(method, route, statusCode) {
  return [String(method || 'UNKNOWN'), String(route || 'unknown'), String(statusCode || '0')].join('|');
}

function recordRequest({ method, route, statusCode, durationMs }) {
  const key = keyFor(method, route, statusCode);
  requestCounters.set(key, (requestCounters.get(key) || 0) + 1);
  durationTotals.set(key, (durationTotals.get(key) || 0) + Number(durationMs || 0));
}

function snapshot() {
  const requests = [];
  for (const [key, count] of requestCounters.entries()) {
    const [method, route, statusCode] = key.split('|');
    const totalDurationMs = durationTotals.get(key) || 0;
    requests.push({
      method,
      route,
      statusCode: Number(statusCode),
      count,
      totalDurationMs,
      averageDurationMs: count ? totalDurationMs / count : 0,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    requests,
  };
}

module.exports = {
  recordRequest,
  snapshot,
};
