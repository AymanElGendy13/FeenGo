// Contrast check (docs/ARCHITECTURE.md section 13): every pair in contrast-pairs.json,
// in every theme, must meet its WCAG AA minimum. Prints each ratio. Exits with 1
// when a pair fails, a role is missing or the pairs file is malformed.
//
// Run alone with `pnpm --filter @feengo/design-tokens check:contrast`; the build
// runs it first and writes nothing when it fails.

import { readFile } from 'node:fs/promises';
import { evaluatePairs, formatRatio } from './contrast.mjs';
import { PACKAGE_DIR, collectThemes, createStyleDictionary, resolvedTokens } from './tokens.mjs';

export const PAIRS_FILE = 'contrast-pairs.json';

/**
 * Reads the pairs file. Throws a plain message if it is not JSON or not shaped
 * as `{ "pairs": [ ... ] }`; validatePairs then checks each pair.
 */
export function parsePairsFile(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(`${PAIRS_FILE} is not valid JSON: ${error.message}`, { cause: error });
  }
  if (typeof data !== 'object' || data === null || !Array.isArray(data.pairs)) {
    throw new Error(`${PAIRS_FILE} must be an object with a "pairs" array.`);
  }
  return data.pairs;
}

/**
 * Returns true when every pair passes. Prints a table of results either way.
 * Any setup problem (a missing source file, a missing theme, a malformed pairs
 * file) is printed as one line and returns false, without a stack trace.
 */
export async function runContrastCheck() {
  let pairs;
  let themes;
  try {
    pairs = parsePairsFile(await readFile(PACKAGE_DIR + PAIRS_FILE, 'utf8'));
    const sd = createStyleDictionary();
    ({ themes } = collectThemes(await resolvedTokens(sd)));
  } catch (error) {
    console.error(`Contrast check failed: ${error.message}`);
    return false;
  }
  const { results, problems } = evaluatePairs(themes, pairs);

  const rows = [
    ['Theme', 'Pair', 'Kind', 'Ratio', 'Needed', 'Result'],
    ...results.map((r) => [
      r.theme,
      `${r.foreground} ${r.foregroundHex} on ${r.background} ${r.backgroundHex}`,
      r.kind,
      formatRatio(r.ratio),
      String(r.minimum),
      r.passes ? 'pass' : 'FAIL',
    ]),
  ];
  const widths = rows[0].map((_, col) => Math.max(...rows.map((row) => row[col].length)));
  console.log(
    `Contrast check, WCAG 2.x AA: ${pairs.length} pairs in ${Object.keys(themes).length} themes (${Object.keys(themes).join(', ')})`,
  );
  for (const row of rows) {
    console.log(
      row
        .map((cell, col) => cell.padEnd(widths[col]))
        .join('  ')
        .trimEnd(),
    );
  }

  if (problems.length > 0) {
    console.error(`\nContrast check failed:`);
    for (const problem of problems) console.error(`- ${problem}`);
    return false;
  }
  console.log('\nContrast check passed.');
  return true;
}

if (import.meta.main) {
  process.exitCode = (await runContrastCheck()) ? 0 : 1;
}
