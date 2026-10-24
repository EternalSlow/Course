const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const reportedErrors = new WeakSet();
let nextErrorId = 1;

export const API_BASE = `${API_ORIGIN}/api`;

function safeRequestUrl(input) {
  const rawUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;
  const url = new URL(rawUrl, window.location.href);
  return {
    href: `${url.origin}${url.pathname}`,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? '443' : '80'),
  };
}

export function reportApplicationError(error, context = {}) {
  if (typeof window === 'undefined') return;
  if (error && (typeof error === 'object' || typeof error === 'function')) {
    if (reportedErrors.has(error)) return;
    reportedErrors.add(error);
  }

  window.dispatchEvent(new CustomEvent('app:error', {
    detail: {
      id: nextErrorId++,
      time: new Date().toISOString(),
      message: error instanceof Error
        ? error.message
        : typeof error?.message === 'string'
          ? error.message
          : String(error),
      name: error?.name ? String(error.name) : 'Error',
      code: error?.code != null ? String(error.code) : '',
      stack: typeof error?.stack === 'string' ? error.stack : '',
      route: window.location.pathname,
      online: navigator.onLine,
      ...context,
    },
  }));
}

export function wasApplicationErrorReported(error) {
  return Boolean(error && (typeof error === 'object' || typeof error === 'function')
    && reportedErrors.has(error));
}

export async function apiFetch(input, options = {}) {
  const request = typeof Request !== 'undefined' && input instanceof Request ? input : null;
  const method = (options.method || request?.method || 'GET').toUpperCase();
  let requestInfo;

  try {
    requestInfo = safeRequestUrl(input);
  } catch (error) {
    reportApplicationError(error, { kind: 'request configuration', method });
    throw error;
  }

  let response;
  try {
    response = await fetch(input, options);
  } catch (error) {
    if (error?.name !== 'AbortError') {
      reportApplicationError(error, {
        kind: 'network',
        method,
        requestUrl: requestInfo.href,
        serverHost: requestInfo.hostname,
        serverPort: requestInfo.port,
      });
    }
    throw error;
  }

  if (response.status >= 500) {
    reportApplicationError(new Error(`Server returned HTTP ${response.status}`), {
      kind: 'http',
      method,
      requestUrl: requestInfo.href,
      serverHost: requestInfo.hostname,
      serverPort: requestInfo.port,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return response;
}

export function apiUrl(path) {
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function assetUrl(path) {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return apiUrl(path);
}
