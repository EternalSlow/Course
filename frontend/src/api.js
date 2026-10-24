const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const API_BASE = `${API_ORIGIN}/api`;

export function apiUrl(path) {
  return `${API_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

export function assetUrl(path) {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  return apiUrl(path);
}
