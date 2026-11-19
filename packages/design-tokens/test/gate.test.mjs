// Tests for the contrast gate's failure paths (docs/ARCHITECTURE.md section 13, Q-04):
// theme collection, missing sources, the pinned pair list, the CSS cascade and the
// build itself. Build tests run against a temporary copy of the package, so the
// real tokens and outputs are never touched. Run with `node --test`.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { describe, test } from 'node:test';
import { cssFormat } from '../scripts/formats.mjs';
import {
  PACKAGE_DIR,
  REQUIRED_THEMES,
  assertSourceFiles,
  collectThemes,
  createStyleDictionary,
  resolvedTokens,
} from '../scripts/tokens.mjs';

const role = (theme, name, value) => ({
  path: ['theme', theme, 'color', name],
  $value: value,
  $description: name,
});

/** A minimal valid pair of themes, as resolved tokens. */
const validTokens = () => [
  role('light', 'surface', '#FBF6EE'),
  role('light', 'onSurface', '#1C2430'),
  role('dark', 'surface', '#1C2430'),
  role('dark', 'onSurface', '#FBF6EE'),
];

/** sha256 of every file under the given folders, keyed by path inside `root`. */
function hashTree(root, folders) {
  const hashes = {};
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else
        hashes[relative(root, path)] = createHash('sha256')
          .update(readFileSync(path))
          .digest('hex');
    }
  };
  for (const folder of folders) walk(join(root, folder));
  return hashes;
}

const OUTPUT_FOLDERS = ['dist', 'flutter'];

/** Copies the package (without node_modules, which is linked) to a new temporary folder. */
function copyPackage() {
  const dir = mkdtempSync(join(tmpdir(), 'feengo-design-tokens-'));
  cpSync(PACKAGE_DIR, dir, {
    recursive: true,
    filter: (src) => !relative(PACKAGE_DIR, src).split(/[\\/]/).includes('node_modules'),
  });
  symlinkSync(join(PACKAGE_DIR, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}

function run(dir, script) {
  return spawnSync(process.execPath, [join(dir, 'scripts', script)], {
    cwd: dir,
    encoding: 'utf8',
  });
}

function withCopy(fn) {
  const dir = copyPackage();
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function editJson(file, change) {
  const data = JSON.parse(readFileSync(file, 'utf8'));
  writeFileSync(file, JSON.stringify(change(data) ?? data, null, 2));
}

/** A clean failure: exit code 1, the message given, and no stack trace. */
function assertCleanFailure(result, message) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stderr, message);
  assert.doesNotMatch(result.stderr, /^\s+at /m, 'printed a stack trace');
}

describe('Q-04 theme collection', () => {
  test('returns light then dark, with roles in the light order, whatever the input order', () => {
    // Reversed: dark comes first, and the light roles appear as onSurface, surface.
    const { themes, roles } = collectThemes(validTokens().reverse());
    assert.deepEqual(Object.keys(themes), ['light', 'dark']);
    assert.deepEqual(roles, ['onSurface', 'surface']);
    assert.deepEqual(Object.keys(themes.dark), roles);
  });

  test('section 13 requires exactly the light and dark themes', () => {
    assert.deepEqual([...REQUIRED_THEMES], ['light', 'dark']);
  });

  test('fails when there are no themes', () => {
    assert.throws(() => collectThemes([]), /exactly light and dark\. Missing: light, dark/);
  });

  test('fails when the dark theme is missing', () => {
    const tokens = validTokens().filter((t) => t.path[1] !== 'dark');
    assert.throws(() => collectThemes(tokens), /Missing: dark\. Extra: none/);
  });

  test('fails on a theme section 13 does not name', () => {
    assert.throws(
      () => collectThemes([...validTokens(), role('dim', 'surface', '#000000')]),
      /Extra: dim/,
    );
  });

  test('fails when the themes define different roles', () => {
    const tokens = [...validTokens(), role('light', 'focus', '#B3204F')];
    assert.throws(
      () => collectThemes(tokens),
      /Theme dark must define the same roles as light\. Missing: focus/,
    );
  });

  test('fails on a value that is not an opaque hex colour, naming the token', () => {
    const tokens = [...validTokens().slice(0, 3), role('dark', 'onSurface', '#FBF6EE80')];
    assert.throws(
      () => collectThemes(tokens),
      /^Error: theme\.dark\.color\.onSurface: Not an opaque hex colour/,
    );
  });
});

describe('Q-04 token sources', () => {
  test('fails when a source file is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'feengo-design-tokens-'));
    try {
      mkdirSync(join(dir, 'tokens'));
      writeFileSync(join(dir, 'tokens', 'base.json'), '{}');
      writeFileSync(join(dir, 'tokens', 'theme.light.json'), '{}');
      assert.throws(
        () => assertSourceFiles(`${dir}/`),
        /Token source file missing: tokens\/theme\.dark\.json\./,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('every source file exists in the package', () => {
    assert.doesNotThrow(() => assertSourceFiles());
  });
});

describe('Q-04 contrast pairs file', () => {
  test('declares exactly the six pairs section 13 requires, with their minimums', () => {
    const { pairs } = JSON.parse(readFileSync(join(PACKAGE_DIR, 'contrast-pairs.json'), 'utf8'));
    assert.deepEqual(
      pairs.map((p) => [p.foreground, p.background, p.kind, p.minimum]),
      [
        ['onSurface', 'surface', 'text', 4.5],
        ['brandText', 'surface', 'largeText', 3],
        ['onSelected', 'selected', 'text', 4.5],
        ['selected', 'surface', 'interface', 3],
        ['outline', 'surface', 'interface', 3],
        ['focus', 'surface', 'interface', 3],
      ],
    );
  });
});

describe('Q-04 CSS themes', () => {
  test('the CSS is the same whatever order the themes are read in', async () => {
    const tokens = await resolvedTokens(createStyleDictionary());
    const isDark = (t) => t.path[0] === 'theme' && t.path[1] === 'dark';
    const darkFirst = [...tokens.filter(isDark), ...tokens.filter((t) => !isDark(t))];
    assert.notDeepEqual(
      darkFirst.map((t) => t.path.join('.')),
      tokens.map((t) => t.path.join('.')),
    );
    assert.equal(
      cssFormat({ dictionary: { allTokens: darkFirst } }),
      cssFormat({ dictionary: { allTokens: tokens } }),
    );
  });

  test('a page with data-theme="dark" matches only the dark selectors', async () => {
    const css = cssFormat({
      dictionary: { allTokens: await resolvedTokens(createStyleDictionary()) },
    });
    const selectorsOf = (property) =>
      [
        ...css
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .matchAll(/([^{}]+)\{[^{}]*--color-surface: (#[0-9A-F]{6});/g),
      ]
        .filter((m) => m[2] === property)
        .map((m) => m[1].trim());
    // Light surface #FBF6EE is set only where data-theme is absent or light.
    assert.deepEqual(selectorsOf('#FBF6EE'), [":root:not([data-theme]),\n[data-theme='light']"]);
    assert.deepEqual(selectorsOf('#1C2430'), ["[data-theme='dark']", ':root:not([data-theme])']);
    assert.match(
      css,
      /@media \(prefers-color-scheme: dark\) \{\n {2}:root:not\(\[data-theme\]\) \{/,
    );
  });
});

describe('Q-04 contrast gate in the build', () => {
  test('check:contrast fails cleanly when theme.dark.json is deleted', () => {
    withCopy((dir) => {
      rmSync(join(dir, 'tokens', 'theme.dark.json'));
      assertCleanFailure(
        run(dir, 'check-contrast.mjs'),
        /Token source file missing: tokens\/theme\.dark\.json/,
      );
    });
  });

  test('check:contrast fails cleanly when theme.dark.json is empty', () => {
    withCopy((dir) => {
      writeFileSync(join(dir, 'tokens', 'theme.dark.json'), '{}');
      assertCleanFailure(
        run(dir, 'check-contrast.mjs'),
        /The themes must be exactly light and dark\. Missing: dark/,
      );
    });
  });

  test('check:contrast fails cleanly on a malformed pairs file', () => {
    withCopy((dir) => {
      const file = join(dir, 'contrast-pairs.json');
      writeFileSync(file, '{ not json');
      assertCleanFailure(run(dir, 'check-contrast.mjs'), /contrast-pairs\.json is not valid JSON/);
      writeFileSync(file, '{ "pairs": 3 }');
      assertCleanFailure(run(dir, 'check-contrast.mjs'), /must be an object with a "pairs" array/);
      writeFileSync(file, '{ "pairs": ["onSurface"] }');
      assertCleanFailure(run(dir, 'check-contrast.mjs'), /Pair 1 .*kind must be one of/);
    });
  });

  test('the build writes nothing when a pair fails', () => {
    withCopy((dir) => {
      editJson(join(dir, 'tokens', 'theme.dark.json'), (data) => {
        data.theme.dark.color.brandText.$value = '#B3204F';
      });
      const before = hashTree(dir, OUTPUT_FOLDERS);
      const result = run(dir, 'build.mjs');
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(
        result.stderr,
        /dark: brandText #B3204F on surface #1C2430 is 2\.41 to 1, below 3/,
      );
      assert.match(result.stderr, /Build stopped: nothing was written\./);
      assert.deepEqual(hashTree(dir, OUTPUT_FOLDERS), before);
    });
  });

  test('the build deletes stale generated files and reproduces the package outputs', () => {
    withCopy((dir) => {
      writeFileSync(join(dir, 'dist', 'css', 'stale.css'), '');
      writeFileSync(join(dir, 'flutter', 'lib', 'stale.dart'), '');
      const result = run(dir, 'build.mjs');
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.equal(existsSync(join(dir, 'dist', 'css', 'stale.css')), false);
      assert.equal(existsSync(join(dir, 'flutter', 'lib', 'stale.dart')), false);
      assert.deepEqual(hashTree(dir, OUTPUT_FOLDERS), hashTree(PACKAGE_DIR, OUTPUT_FOLDERS));
    });
  });
});
