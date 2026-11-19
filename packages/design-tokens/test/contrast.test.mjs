// Unit tests for the WCAG contrast maths behind the contrast check
// (docs/ARCHITECTURE.md section 13, Q-04). Run with `node --test`.

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  contrastRatio,
  evaluatePairs,
  formatRatio,
  parseHex,
  relativeLuminance,
  validatePairs,
} from '../scripts/contrast.mjs';

const ratio = (a, b) => formatRatio(contrastRatio(a, b));

describe('Q-04 contrast maths', () => {
  test('parses #RGB and #RRGGBB in either case', () => {
    assert.deepEqual(parseHex('#B3204F'), [179, 32, 79]);
    assert.deepEqual(parseHex('#b3204f'), [179, 32, 79]);
    assert.deepEqual(parseHex('#fff'), [255, 255, 255]);
  });

  test('refuses colours with alpha, names and malformed values', () => {
    for (const bad of ['#B3204F80', '#ffff', 'red', 'B3204F', '#12345', '', undefined, 42]) {
      assert.throws(() => parseHex(bad), /Not an opaque hex colour/, String(bad));
    }
  });

  test('relative luminance is 0 for black and 1 for white', () => {
    assert.equal(relativeLuminance('#000000'), 0);
    assert.equal(relativeLuminance('#FFFFFF'), 1);
  });

  test('uses the sRGB linear segment for dark channels', () => {
    // 10/255 is below the threshold, so it is divided by 12.92.
    assert.equal(relativeLuminance('#0A0A0A'), 10 / 255 / 12.92);
  });

  test('black on white is 21 and a colour on itself is 1', () => {
    assert.equal(contrastRatio('#000000', '#FFFFFF'), 21);
    assert.equal(contrastRatio('#B3204F', '#B3204F'), 1);
  });

  test('the order of the two colours does not matter', () => {
    assert.equal(contrastRatio('#1C2430', '#FBF6EE'), contrastRatio('#FBF6EE', '#1C2430'));
  });

  test('matches the ratios in docs/design/brief.md section 8 and ARCHITECTURE.md section 13', () => {
    assert.equal(ratio('#1C2430', '#FBF6EE'), '14.52');
    assert.equal(ratio('#B3204F', '#FBF6EE'), '6.03');
    assert.equal(ratio('#FFFFFF', '#B3204F'), '6.49');
    assert.equal(ratio('#F2A93B', '#1C2430'), '7.82');
    assert.equal(ratio('#B3204F', '#1C2430'), '2.41');
    assert.equal(ratio('#0E6B5E', '#FBF6EE'), '5.94');
    assert.equal(ratio('#0E6B5E', '#1C2430'), '2.44');
    assert.equal(ratio('#FFFFFF', '#0E6B5E'), '6.40');
    assert.equal(ratio('#F2A93B', '#FBF6EE'), '1.86');
    assert.equal(ratio('#FFFFFF', '#F2A93B'), '2.00');
  });
});

describe('Q-04 contrast pairs', () => {
  const pair = (foreground, background, kind, minimum) => ({
    foreground,
    background,
    kind,
    minimum,
  });

  test('passes pairs at or above their minimum', () => {
    const themes = { light: { text: '#1C2430', surface: '#FBF6EE' } };
    const { results, problems } = evaluatePairs(themes, [pair('text', 'surface', 'text', 4.5)]);
    assert.deepEqual(problems, []);
    assert.equal(results.length, 1);
    assert.equal(results[0].passes, true);
  });

  test('fails a pair below its minimum, in the theme where it fails', () => {
    const themes = {
      light: { brandText: '#B3204F', surface: '#FBF6EE' },
      dark: { brandText: '#B3204F', surface: '#1C2430' },
    };
    const { results, problems } = evaluatePairs(themes, [
      pair('brandText', 'surface', 'largeText', 3),
    ]);
    assert.deepEqual(
      results.map((r) => [r.theme, r.passes]),
      [
        ['light', true],
        ['dark', false],
      ],
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^dark: brandText #B3204F on surface #1C2430 is 2\.41 to 1, below 3/);
  });

  test('does not round up: a ratio just under the minimum fails', () => {
    // #158A00 on white is 4.4994: it prints as 4.50 but is below 4.5, so it fails.
    // #767676 on white is 4.54 and passes.
    assert.equal(ratio('#158A00', '#FFFFFF'), '4.50');
    const themes = { t: { a: '#158A00', b: '#FFFFFF', c: '#767676' } };
    const { results } = evaluatePairs(themes, [
      pair('a', 'b', 'text', 4.5),
      pair('c', 'b', 'text', 4.5),
    ]);
    assert.deepEqual(
      results.map((r) => r.passes),
      [false, true],
    );
  });

  test('reports a role that a theme does not define', () => {
    const { problems } = evaluatePairs({ dark: { surface: '#1C2430' } }, [
      pair('onSurface', 'surface', 'text', 4.5),
    ]);
    assert.deepEqual(problems, ['dark: role onSurface is not defined.']);
  });

  test('refuses a minimum below the WCAG AA minimum for its kind, or an unknown kind', () => {
    assert.equal(validatePairs([pair('a', 'b', 'text', 4.5)]).length, 0);
    assert.equal(validatePairs([pair('a', 'b', 'text', 3)]).length, 1);
    assert.equal(validatePairs([pair('a', 'b', 'interface', 2.5)]).length, 1);
    assert.equal(validatePairs([pair('a', 'b', 'decoration', 1)]).length, 1);
    assert.equal(validatePairs([]).length, 1);
  });
});
