import { describe, expect, it } from 'vitest';
import { buildSharedGameUrl, getSharedGameCodeFromSearch } from './sharedGameLinks';

describe('shared game link helpers', () => {
  it('extracts a normalized room code from a query string', () => {
    expect(getSharedGameCodeFromSearch('?game=kmq47f')).toBe('KMQ47F');
    expect(getSharedGameCodeFromSearch('?game=abc-123')).toBe('ABC123');
    expect(getSharedGameCodeFromSearch('')).toBeNull();
  });

  it('builds a shareable URL with the room code in the query string', () => {
    expect(buildSharedGameUrl('KMQ47F', '/')).toBe('/?game=KMQ47F');
    expect(buildSharedGameUrl('XYZ123', '/play')).toBe('/play?game=XYZ123');
  });
});
