import { describe, expect, it } from 'vitest';
import { checkAppMessages } from '../../scripts/check-messages.ts';

describe('messages', () => {
  it('S0 every message key exists in English and Arabic', () => {
    expect(checkAppMessages()).toEqual([]);
  });
});
