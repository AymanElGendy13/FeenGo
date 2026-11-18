import { describe, expect, it } from 'vitest';

// Temporary: proves CI fails on a failing test. Reverted in the next commit.
describe('CI proof', () => {
  it('fails on purpose', () => {
    expect(1).toBe(2);
  });
});
