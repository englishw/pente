const BASE_PATH = import.meta.env.BASE_URL || '/';

export function normalizeSharedGameCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function getSharedGameCodeFromSearch(search: string): string | null {
  if (!search) return null;

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const value = params.get('game');
  if (typeof value !== 'string') return null;

  const normalized = normalizeSharedGameCode(value);
  return normalized.length === 6 ? normalized : null;
}

export function buildSharedGameUrl(code: string, path = '/'): string {
  const normalized = normalizeSharedGameCode(code);
  const safePath = path && path !== '/' ? path : '/';
  const basePath = BASE_PATH.endsWith('/') ? BASE_PATH : `${BASE_PATH}/`;
  const url = new URL(safePath, 'http://localhost');
  const normalizedPath = `${basePath}${url.pathname.replace(/^\//, '')}`.replace(/\/+/g, '/');
  const finalUrl = new URL(normalizedPath, 'http://localhost');
  finalUrl.searchParams.set('game', normalized);
  return `${finalUrl.pathname}${finalUrl.search}`;
}
