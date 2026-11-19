// WCAG 2.x contrast maths and the pair evaluation used by the contrast check.
// No dependencies: the formula is small, and owning it keeps the gate auditable.
//
// Relative luminance: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
// Contrast ratio:     https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
//
// WCAG 2.0 printed the linearisation threshold as 0.03928 and WCAG 2.2 uses the
// sRGB value 0.04045. No 8-bit channel value falls between the two (10/255 is
// 0.0392 and 11/255 is 0.0431), so both give identical results for hex colours.

/** The WCAG AA minimum for each kind of pair. */
export const WCAG_AA_MINIMUM = Object.freeze({
  text: 4.5,
  largeText: 3,
  interface: 3,
});

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parses an opaque sRGB hex colour (#RGB or #RRGGBB) into 0 to 255 channels.
 * Colours with alpha are refused: their contrast depends on what lies beneath.
 */
export function parseHex(hex) {
  if (typeof hex !== 'string' || !HEX.test(hex)) {
    throw new Error(`Not an opaque hex colour (#RGB or #RRGGBB): ${JSON.stringify(hex)}`);
  }
  let digits = hex.slice(1);
  if (digits.length === 3) {
    digits = [...digits].map((d) => d + d).join('');
  }
  return [0, 2, 4].map((i) => Number.parseInt(digits.slice(i, i + 2), 16));
}

function linearise(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, from 0 (black) to 1 (white). */
export function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex).map(linearise);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, from 1 to 21. The order of the two colours does not matter. */
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Two decimals, as WCAG tools and docs/ARCHITECTURE.md section 13 print ratios. */
export function formatRatio(ratio) {
  return ratio.toFixed(2);
}

/**
 * Checks that a pairs file is well formed: known kinds, and no minimum below
 * the WCAG AA minimum for its kind. Returns a list of problems (empty if fine).
 */
export function validatePairs(pairs) {
  const problems = [];
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return ['The pairs file declares no pairs.'];
  }
  pairs.forEach((pair, index) => {
    const label = `Pair ${index + 1} (${pair?.foreground} on ${pair?.background})`;
    if (typeof pair?.foreground !== 'string' || typeof pair?.background !== 'string') {
      problems.push(`${label}: foreground and background must be role names.`);
    }
    const floor = WCAG_AA_MINIMUM[pair?.kind];
    if (floor === undefined) {
      problems.push(
        `${label}: kind must be one of ${Object.keys(WCAG_AA_MINIMUM).join(', ')}, not ${JSON.stringify(pair?.kind)}.`,
      );
    } else if (typeof pair.minimum !== 'number' || pair.minimum < floor) {
      problems.push(`${label}: minimum must be a number of at least ${floor} for ${pair.kind}.`);
    }
  });
  return problems;
}

/**
 * Evaluates every pair in every theme.
 *
 * @param {Record<string, Record<string, string>>} themes theme name to role name to hex
 * @param {Array<{foreground: string, background: string, kind: string, minimum: number}>} pairs
 * @returns {{results: Array<object>, problems: string[]}} one result per pair and theme;
 *   problems lists malformed pairs, missing roles and failing pairs
 */
export function evaluatePairs(themes, pairs) {
  const problems = validatePairs(pairs);
  const results = [];
  if (problems.length > 0) {
    return { results, problems };
  }
  for (const [theme, roles] of Object.entries(themes)) {
    for (const pair of pairs) {
      const foreground = roles[pair.foreground];
      const background = roles[pair.background];
      const missing = [pair.foreground, pair.background].filter((role) => !Object.hasOwn(roles, role));
      if (missing.length > 0) {
        problems.push(`${theme}: role ${missing.join(' and ')} is not defined.`);
        continue;
      }
      const ratio = contrastRatio(foreground, background);
      // WCAG thresholds are not rounded: 4.499 fails 4.5.
      const passes = ratio >= pair.minimum;
      results.push({
        theme,
        ...pair,
        foregroundHex: foreground,
        backgroundHex: background,
        ratio,
        passes,
      });
      if (!passes) {
        problems.push(
          `${theme}: ${pair.foreground} ${foreground} on ${pair.background} ${background} is ${formatRatio(ratio)} to 1, below ${pair.minimum} for ${pair.kind}.`,
        );
      }
    }
  }
  return { results, problems };
}
