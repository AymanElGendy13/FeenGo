// Shared Style Dictionary configuration and token helpers for the build and the
// contrast check (docs/ARCHITECTURE.md section 13).

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { parseHex } from './contrast.mjs';

/** Absolute path of the package folder, so the scripts work from any directory. */
export const PACKAGE_DIR = fileURLToPath(new URL('..', import.meta.url));

export const SOURCE_FILES = [
  'tokens/base.json',
  'tokens/theme.light.json',
  'tokens/theme.dark.json',
];

/** The themes section 13 requires, in output order: light is the default. */
export const REQUIRED_THEMES = Object.freeze(['light', 'dark']);

/**
 * Fails if a source file is missing. Style Dictionary skips source paths that
 * match nothing, so without this a deleted theme file would pass unnoticed.
 */
export function assertSourceFiles(packageDir = PACKAGE_DIR) {
  const missing = SOURCE_FILES.filter((file) => !existsSync(packageDir + file));
  if (missing.length > 0) {
    throw new Error(`Token source file missing: ${missing.join(', ')}.`);
  }
}

/** Top-level groups that are not exported as they are: the raw palette and the themes. */
const PALETTE_GROUP = 'color';
const THEME_GROUP = 'theme';

/**
 * Creates the Style Dictionary instance. Formats and platforms are passed in by
 * the build; the contrast check only reads the resolved tokens.
 */
export function createStyleDictionary({ formats = {}, platforms } = {}) {
  assertSourceFiles();
  return new StyleDictionary({
    source: SOURCE_FILES.map((file) => PACKAGE_DIR + file),
    usesDtcg: true,
    // A collision, a broken reference or any other warning stops the build.
    log: { warnings: 'error', verbosity: 'default' },
    hooks: { formats },
    platforms: platforms ?? { resolve: { transforms: ['name/kebab'] } },
  });
}

/** Resolved tokens, with every reference replaced by its value. */
export async function resolvedTokens(sd, platform = Object.keys(sd.platforms)[0]) {
  const { allTokens } = await sd.getPlatformTokens(platform);
  return allTokens;
}

/**
 * Collects the theme roles: `theme.<name>.color.<role>` becomes
 * `{ <name>: { <role>: '#RRGGBB' } }`. Themes come out in REQUIRED_THEMES order
 * and roles in the light theme's source order, whatever order the files are read
 * in. Fails if a value is not an opaque hex colour, if the themes are not exactly
 * REQUIRED_THEMES, or if they do not define the same roles.
 */
export function collectThemes(allTokens) {
  const themes = {};
  const descriptions = {};
  for (const token of allTokens) {
    const [group, theme, kind, role, ...rest] = token.path;
    if (group !== THEME_GROUP) continue;
    if (kind !== 'color' || role === undefined || rest.length > 0) {
      throw new Error(
        `Unexpected theme token ${token.path.join('.')}: use theme.<name>.color.<role>.`,
      );
    }
    try {
      parseHex(token.$value);
    } catch (error) {
      throw new Error(`${token.path.join('.')}: ${error.message}`, { cause: error });
    }
    themes[theme] ??= {};
    themes[theme][role] = token.$value.toUpperCase();
    descriptions[role] ??= token.$description;
  }
  const found = Object.keys(themes);
  const missingThemes = REQUIRED_THEMES.filter((name) => !found.includes(name));
  const extraThemes = found.filter((name) => !REQUIRED_THEMES.includes(name));
  if (missingThemes.length > 0 || extraThemes.length > 0) {
    throw new Error(
      `The themes must be exactly ${REQUIRED_THEMES.join(' and ')}. Missing: ${missingThemes.join(', ') || 'none'}. Extra: ${extraThemes.join(', ') || 'none'}.`,
    );
  }
  const [first, ...others] = REQUIRED_THEMES;
  const roles = Object.keys(themes[first]);
  for (const name of others) {
    const other = Object.keys(themes[name]);
    const missing = roles.filter((r) => !other.includes(r));
    const extra = other.filter((r) => !roles.includes(r));
    if (missing.length > 0 || extra.length > 0) {
      throw new Error(
        `Theme ${name} must define the same roles as ${first}. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`,
      );
    }
  }
  const ordered = Object.fromEntries(
    REQUIRED_THEMES.map((name) => [name, Object.fromEntries(roles.map((r) => [r, themes[name][r]]))]),
  );
  return { themes: ordered, roles, descriptions };
}

/** Tokens exported as they are: everything except the raw palette and the themes. */
export function exportedTokens(allTokens) {
  return allTokens.filter((t) => t.path[0] !== PALETTE_GROUP && t.path[0] !== THEME_GROUP);
}

function unitValue(value, unit, token) {
  if (typeof value === 'object' && value !== null && value.unit === unit) {
    return value.value;
  }
  if (typeof value === 'string' && value.endsWith(unit)) {
    return Number(value.slice(0, -unit.length));
  }
  throw new Error(
    `Token ${token.path.join('.')} must be in ${unit}, got ${JSON.stringify(value)}.`,
  );
}

/** A dimension token in px, as a number. */
export function px(token) {
  return unitValue(token.$value, 'px', token);
}

/** A duration token in ms, as a number. */
export function ms(token) {
  return unitValue(token.$value, 'ms', token);
}

/** Rounds away floating-point noise for printing, and drops trailing zeros. */
export function num(value) {
  return String(Number(value.toFixed(4)));
}

/** 'line-height' style for CSS: `lineHeight` becomes `line-height`. */
export function kebab(segment) {
  return segment.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** `['duration', 'short']` becomes `durationShort`. */
export function camel(segments) {
  return segments.map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1))).join('');
}

/** `stroke` becomes `Stroke`. */
export function pascal(segment) {
  return segment[0].toUpperCase() + segment.slice(1);
}

/** A CSS font-family list: names with spaces or capitals are quoted, generic families are not. */
export function cssFontFamily(families) {
  const list = Array.isArray(families) ? families : [families];
  return list.map((f) => (/^[a-z-]+$/.test(f) ? f : `'${f}'`)).join(', ');
}
