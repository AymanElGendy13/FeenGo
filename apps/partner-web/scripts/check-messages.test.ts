// Tests for the i18n:check script itself (docs/ARCHITECTURE.md section 14).
import { describe, expect, it } from 'vitest';
import { compareMessages, placeholdersOf } from './check-messages.ts';

const en = (content: unknown) => ({ name: 'en.json', content });
const ar = (content: unknown) => ({ name: 'ar.json', content });

describe('i18n:check', () => {
  it('S0 i18n:check passes files with the same keys and placeholders', () => {
    const problems = compareMessages(
      en({ a: { b: 'Hello {name}', c: 'Plain' } }),
      ar({ a: { b: 'مرحبًا {name}', c: 'نص' } }),
    );
    expect(problems).toEqual([]);
  });

  it('S0 i18n:check reports a key missing from either file', () => {
    const problems = compareMessages(
      en({ a: { b: 'One', c: 'Two' } }),
      ar({ a: { b: 'واحد' }, d: 'زائد' }),
    );
    expect(problems).toEqual([
      'ar.json: "a.c" is missing (it exists in en.json)',
      'en.json: "d" is missing (it exists in ar.json)',
    ]);
  });

  it('S0 i18n:check reports a missing, renamed or retyped placeholder', () => {
    const problems = compareMessages(
      en({ missing: 'Hi {name}', renamed: '{count} left', retyped: '{count, number} left' }),
      ar({ missing: 'مرحبًا', renamed: 'تبقى {total}', retyped: 'تبقى {count}' }),
    );
    expect(problems).toEqual([
      '"missing": placeholders differ: en.json has {name}, ar.json has none',
      '"renamed": placeholders differ: en.json has {count}, ar.json has {total}',
      '"retyped": placeholders differ: en.json has {count, number}, ar.json has {count}',
    ]);
  });

  it('S0 i18n:check accepts different plural forms for the same argument', () => {
    const problems = compareMessages(
      en({ guests: '{count, plural, one {# guest} other {# guests}}' }),
      ar({
        guests:
          '{count, plural, zero {لا ضيوف} one {ضيف واحد} two {ضيفان} few {# ضيوف} many {# ضيفًا} other {# ضيف}}',
      }),
    );
    expect(problems).toEqual([]);
  });

  it('S0 i18n:check reports empty text, values that are not text and broken braces', () => {
    const problems = compareMessages(en({ a: '', b: 3, c: 'Hi {name' }), ar({ a: 'أ', b: 'ب', c: 'ج' }));
    expect(problems).toEqual([
      'en.json: "a" is empty',
      'en.json: "b" must be text or a group of messages',
      'en.json: "b" is missing (it exists in ar.json)',
      'en.json: "c" is not a valid ICU message: an argument is not closed',
    ]);
  });

  it('S0 i18n:check finds arguments inside plural options and ignores quoted braces', () => {
    expect(
      placeholdersOf("{count, plural, one {# table for {venue}} other {# tables}} '{literal}'"),
    ).toEqual(['count, plural', 'venue']);
    expect(placeholdersOf("It''s {name}'s turn")).toEqual(['name']);
    expect(placeholdersOf('{amount, number, ::currency/EGP}')).toEqual(['amount, number']);
  });
});
