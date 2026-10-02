// GatewayTransport: the only way any client reaches the gateway.
// Clients consume typed contracts over HTTP. No UI package imports
// backend internals, touches PostgreSQL, or reads authority state.

export class TransportError extends Error {
  constructor(status, detail) {
    super(`gateway ${status}: ${detail}`);
    this.name = "TransportError";
    this.status = status;
  }
}

function defaultRequest({ baseUrl, method, path, query, headers }) {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return globalThis.fetch(url.toString(), { method, headers }).then(async (res) => {
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text.slice(0, 2000) };
    }
    if (!res.ok) throw new TransportError(res.status, data && data.error ? data.error : text.slice(0, 200));
    return data;
  });
}

export function createGatewayTransport({ baseUrl, request } = {}) {
  if (!baseUrl || typeof baseUrl !== "string")
    throw new TransportError(0, "baseUrl is required");
  const doRequest = request || defaultRequest;
  const calls = [];
  return {
    baseUrl,
    calls,
    request({ method, path, query, headers }) {
      if (!path || !path.startsWith("/"))
        throw new TransportError(0, `refusing non-gateway path '${path}'`);
      if (!["GET", "POST", "PATCH", "DELETE"].includes(method))
        throw new TransportError(0, `refusing unknown method '${method}'`);
      calls.push({ method, path, at: new Date().toISOString() });
      return doRequest({ baseUrl, method, path, query, headers });
    },
  };
}
