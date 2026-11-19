# @feengo/design-tokens

The one source of FeenGo's colours, type, spacing, radius, sizes and motion for the customer app and both websites (`docs/ARCHITECTURE.md` section 13). Owner: ui-ux-designer.

Every value here is **provisional**. The final palette and type are chosen in phase 4 of `docs/design/plan.md`. Apps refer only to the semantic roles and named steps, so changing the design later is an edit here, a build and a commit, with no app code changes.

## What is in the package

| Path                                                | What it is                                                                                                                                                      | Edited by hand?                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `tokens/base.json`                                  | The raw palette (the five provisional colours from `docs/ROADMAP.md`, plus white), font family and weights, type scale, spacing, radius, sizes, strokes, motion | Yes                            |
| `tokens/theme.light.json`, `tokens/theme.dark.json` | The colour roles for each theme. Each role points to a base colour.                                                                                             | Yes                            |
| `contrast-pairs.json`                               | The colour pairs the contrast check tests, each with its WCAG AA minimum                                                                                        | Yes                            |
| `fonts/`                                            | IBM Plex Sans Arabic, Regular (400), Medium (500) and Bold (700), with its licence, `OFL.txt`                                                                   | Only to add or remove a weight |
| `scripts/`                                          | The build, the formats and the contrast check                                                                                                                   | Yes                            |
| `dist/css/tokens.css`                               | CSS custom properties, for both websites                                                                                                                        | **No, generated**              |
| `dist/ts/tokens.ts`                                 | Typed constants, for the websites where CSS is not enough                                                                                                       | **No, generated**              |
| `flutter/`                                          | The Dart package `feengo_design_tokens` for the app: `lib/feengo_design_tokens.dart`, `pubspec.yaml` and a copy of the fonts                                    | **No, generated**              |

The tokens use the W3C Design Tokens Community Group format (`$value`, `$type`, `$description`). The build uses Style Dictionary 5.8.0, the only dependency (`docs/ARCHITECTURE.md` section 18.4).

## How to build

```sh
pnpm install
pnpm --filter @feengo/design-tokens build           # contrast check, then every output
pnpm --filter @feengo/design-tokens check:contrast  # the contrast check alone
pnpm --filter @feengo/design-tokens test            # unit tests for the contrast maths
```

The build runs the contrast check first. If a pair fails, a source file or a theme is missing, or the pairs file is malformed, the build stops with exit code 1 and writes nothing. Otherwise it empties `dist/` and `flutter/lib/` and writes them again, so a file the build no longer produces disappears.

The outputs are committed, so the app builds without Node and reviewers see exactly what changed. CI runs the build and fails if anything in this package differs from what is committed. The outputs carry no timestamps, so the same tokens always give the same bytes.

## How to change a token

1. Edit the JSON in `tokens/`. Change a colour in `base.json`, or point a role in a theme file at a different base colour.
2. To add a colour role, add it to **both** theme files; the build fails if the two themes define different roles. If the role is used for text or for an interface part, add its pairs to `contrast-pairs.json`.
3. Run `pnpm --filter @feengo/design-tokens build`. Read the contrast table it prints.
4. Commit the token JSON and everything the build changed in `dist/` and `flutter/`, in one commit.
5. Update the screen specs in `docs/design/` that name the changed values.

Do not edit the generated files: the next build overwrites them, and CI fails on the difference.

Rules the files follow:

- Apps never read the raw palette. Only the theme roles are exported, so `color.primary` is not in any output.
- Sizes are in px. One px is one logical pixel (dp) in Flutter. In CSS the type scale is written in rem (16 px = 1rem), so it follows the browser's text size setting; everything else is in px.
- Line heights carry one value per script, `en` and `ar`, because Arabic needs more line height than Latin (`docs/design/brief.md` section 6).
- Every font weight in `font.weight` must have a file in `fonts/`, listed in `FONT_FACES` in `scripts/build.mjs`. The build checks both.

## The contrast check

The check computes the WCAG 2.x contrast ratio from the hex values, with its own small implementation in `scripts/contrast.mjs` and no extra dependency. It tests every pair in `contrast-pairs.json` in every theme:

- 4.5 to 1 for text;
- 3 to 1 for large text and interface parts (control edges, selected states, focus rings).

Ratios are not rounded before comparing, so 4.499 fails 4.5. A pair's minimum can be raised but never set below the WCAG minimum for its kind.

## Why the dark values are temporary

The provisional palette fails contrast in dark mode: primary `#B3204F` on the dark neutral `#1C2430` is 2.41 to 1, below even the 3 to 1 for interface parts. Design must not block the build, so S0 ships temporary dark values that pass (`docs/ARCHITECTURE.md` section 13):

- `brandText` and `selected` use the light neutral `#FBF6EE` instead of primary;
- `focus` uses the accent `#F2A93B` (7.82 to 1 on the dark neutral).

The designer replaces these with real dark-mode tints when the design system is approved: an edit to `tokens/theme.dark.json`, with the contrast check proving it passes.

## Using the outputs

### Websites

- Import `@feengo/design-tokens/tokens.css` once, in the root layout. With no `data-theme` attribute, the page follows the system setting through `prefers-color-scheme`, and is light when the system states no preference; this is what S0 needs. `data-theme='light'` or `'dark'` on any element forces that theme for its subtree. The light and dark selectors never overlap, so the result does not depend on the order of the rules.
- Colour roles are `--color-<role>`, for example `--color-on-surface`. `--typography-<step>-line-height` picks the Arabic line height when the page's `lang` is `ar`.
- `@feengo/design-tokens/tokens` gives the same values as typed constants (`colors.light.surface`, `spacing.md`).
- The fonts are at `@feengo/design-tokens/fonts/*`, for `next/font/local` (`docs/ARCHITECTURE.md` section 12). They are TrueType files.

### Flutter app

- Depend on the package with `feengo_design_tokens: path: ../../packages/design-tokens/flutter`.
- Build `ThemeData` from `FeenGoColors.light` and `FeenGoColors.dark`, mapping each role explicitly. Do not use `ColorScheme.fromSeed`.
- Text styles come from `FeenGoTypeScale`, for example `FeenGoTypeScale.body.toTextStyle(languageCode)`, which sets the font, the weight and the line height for the language.
- Spacing, radius, sizes, strokes and motion are in `FeenGoSpacing`, `FeenGoRadius`, `FeenGoSize`, `FeenGoStroke` and `FeenGoMotion`.
- The font licence is an asset at `packages/feengo_design_tokens/fonts/OFL.txt`, for the app's licences page.

## Fonts and licence

IBM Plex Sans Arabic, from the Google Fonts repository (`ofl/ibmplexsansarabic`, commit `5bd87dfc525c8a0d1d8529d3684716e00c3fc59a`, 2026-11-18). Copyright 2017 IBM Corp., licensed under the SIL Open Font License 1.1, in `fonts/OFL.txt`. "Plex" is a Reserved Font Name: a modified version of the font must not use it.

The family covers Arabic and Latin. Only the weights the S0 screens use are shipped: Regular, Medium and Bold.
