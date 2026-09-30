export async function api(path, options = {}) {
  const { method = 'GET', body } = options;
  const headers = body ? { 'Content-Type': 'application/json' } : undefined;
  const bodyStr = body ? JSON.stringify(body) : undefined;

  // 1. Try Vite proxy relative path (/api...)
  try {
    const r = await fetch(`/api${path}`, { method, headers, body: bodyStr });
    const type = r.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Request failed');
      return data;
    }
  } catch (err) {
    // If not a deliberate server error message, proceed to fallback
    if (err.message && err.message !== 'Failed to fetch' && !err.message.includes('Backend response unavailable')) {
      // If it's a 4xx/5xx from API with error message, keep it unless it was HTML
    }
  }

  // 2. Direct fallback to backend server on port 4000
  try {
    const directUrl = `http://127.0.0.1:4000/api${path}`;
    const r2 = await fetch(directUrl, { method, headers, body: bodyStr });
    const type2 = r2.headers.get('content-type') || '';
    if (type2.includes('application/json')) {
      const data2 = await r2.json();
      if (!r2.ok) throw new Error(data2.error || 'Request failed');
      return data2;
    }
  } catch (err2) {
    // Both failed
  }

  throw new Error('Backend response unavailable. Please ensure server is running with "npm run dev".');
}
