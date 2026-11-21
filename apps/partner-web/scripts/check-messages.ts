// Checks that messages/en.json and messages/ar.json have the same keys and the
// same placeholders in every message (docs/ARCHITECTURE.md section 14). No
// dependency: Node runs this file directly with its built-in type stripping, so it
// imports only Node's own modules and uses only erasable TypeScript syntax.
//
//   node scripts/check-messages.ts      exit code 0 when the files match, 1 otherwise
//
// Placeholders are ICU MessageFormat arguments, such as {name}, {count, number}
// or {count, plural, one {...} other {...}}. Their names and types must match.
// The plural and select options inside them are not compared, because Arabic has
// more plural forms than English (zero, one, two, few, many, other).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface MessageFile {
  name: string;
  content: unknown;
}

/** Flattens nested message objects to dotted keys. Records leaves that are not text. */
export function flattenMessages(
  tree: unknown,
  problems: string[] = [],
  fileName = 'messages',
  prefix = '',
): Map<string, string> {
  const flat = new Map<string, string>();
  if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) {
    problems.push(`${fileName}: ${prefix || 'the file'} must be an object of messages`);
    return flat;
  }
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (key === '' || key.includes('.')) {
      problems.push(`${fileName}: "${path}" is not a valid key (empty or containing a dot)`);
    } else if (typeof value === 'string') {
      if (value.trim() === '') {
        problems.push(`${fileName}: "${path}" is empty`);
      }
      flat.set(path, value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const [childKey, childValue] of flattenMessages(value, problems, fileName, path)) {
        flat.set(childKey, childValue);
      }
    } else {
      problems.push(`${fileName}: "${path}" must be text or a group of messages`);
    }
  }
  return flat;
}

const pluralTypes = new Set(['plural', 'selectordinal']);
const optionTypes = new Set(['plural', 'selectordinal', 'select']);

/**
 * The ICU arguments in one message, sorted: "name" for a simple argument and
 * "name, type" for a typed one. Throws when the braces do not balance.
 */
export function placeholdersOf(message: string): string[] {
  const found = new Set<string>();
  const end = parseText(message, 0, found, false);
  if (end !== message.length) {
    throw new Error(`unexpected "}" at position ${end}`);
  }
  return [...found].sort();
}

// Reads message text up to an unmatched "}" or the end, and returns that index.
function parseText(text: string, start: number, found: Set<string>, inPlural: boolean): number {
  let i = start;
  while (i < text.length) {
    const char = text[i];
    if (char === "'") {
      i = skipApostrophe(text, i, inPlural);
    } else if (char === '{') {
      i = parseArgument(text, i + 1, found);
    } else if (char === '}') {
      return i;
    } else {
      i += 1;
    }
  }
  return i;
}

// ICU quoting: '' is a literal apostrophe; an apostrophe before a special
// character starts quoted text up to the next single apostrophe; any other
// apostrophe is literal.
function skipApostrophe(text: string, start: number, inPlural: boolean): number {
  const next = text[start + 1];
  if (next === "'") {
    return start + 2;
  }
  const special = next === '{' || next === '}' || next === '|' || (inPlural && next === '#');
  if (!special) {
    return start + 1;
  }
  let i = start + 1;
  while (i < text.length) {
    if (text[i] === "'") {
      if (text[i + 1] === "'") {
        i += 2;
        continue;
      }
      return i + 1;
    }
    i += 1;
  }
  return i;
}

// Reads one argument after its "{" and returns the index after its "}".
function parseArgument(text: string, start: number, found: Set<string>): number {
  const nameEnd = indexOfAny(text, start, ',}');
  const name = text.slice(start, nameEnd).trim();
  if (name === '') {
    throw new Error(`empty argument at position ${start}`);
  }
  if (text[nameEnd] === '}') {
    found.add(name);
    return nameEnd + 1;
  }

  const typeEnd = indexOfAny(text, nameEnd + 1, ',}');
  const type = text.slice(nameEnd + 1, typeEnd).trim();
  found.add(`${name}, ${type}`);
  if (text[typeEnd] === '}') {
    return typeEnd + 1;
  }
  if (optionTypes.has(type)) {
    return parseOptions(text, typeEnd + 1, found, pluralTypes.has(type));
  }
  // A style such as {amount, number, ::currency/EGP}: skip it, keeping nesting.
  return skipToClosingBrace(text, typeEnd + 1);
}

// Reads the "selector {message}" pairs of a plural or select argument.
function parseOptions(text: string, start: number, found: Set<string>, inPlural: boolean): number {
  let i = start;
  for (;;) {
    while (i < text.length && /\s/.test(text[i] ?? '')) {
      i += 1;
    }
    if (i >= text.length) {
      throw new Error('a plural or select argument is not closed');
    }
    if (text[i] === '}') {
      return i + 1;
    }
    const selectorStart = i;
    while (i < text.length && !/[\s{}]/.test(text[i] ?? '')) {
      i += 1;
    }
    const selector = text.slice(selectorStart, i);
    if (selector.startsWith('offset:')) {
      continue;
    }
    while (i < text.length && /\s/.test(text[i] ?? '')) {
      i += 1;
    }
    if (text[i] !== '{') {
      throw new Error(`option "${selector}" has no message at position ${i}`);
    }
    i = parseText(text, i + 1, found, inPlural);
    if (text[i] !== '}') {
      throw new Error(`option "${selector}" is not closed`);
    }
    i += 1;
  }
}

function skipToClosingBrace(text: string, start: number): number {
  let depth = 1;
  let i = start;
  while (i < text.length) {
    const char = text[i];
    if (char === "'") {
      i = skipApostrophe(text, i, false);
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    }
    i += 1;
  }
  throw new Error('an argument is not closed');
}

function indexOfAny(text: string, start: number, characters: string): number {
  for (let i = start; i < text.length; i += 1) {
    if (characters.includes(text[i] ?? '')) {
      return i;
    }
  }
  throw new Error('an argument is not closed');
}

/** Every difference between the reference file and the translation, as readable lines. */
export function compareMessages(reference: MessageFile, translation: MessageFile): string[] {
  const problems: string[] = [];
  const referenceMessages = flattenMessages(reference.content, problems, reference.name);
  const translationMessages = flattenMessages(translation.content, problems, translation.name);

  for (const key of referenceMessages.keys()) {
    if (!translationMessages.has(key)) {
      problems.push(`${translation.name}: "${key}" is missing (it exists in ${reference.name})`);
    }
  }
  for (const key of translationMessages.keys()) {
    if (!referenceMessages.has(key)) {
      problems.push(`${reference.name}: "${key}" is missing (it exists in ${translation.name})`);
    }
  }

  for (const [key, referenceText] of referenceMessages) {
    const translationText = translationMessages.get(key);
    if (translationText === undefined) {
      continue;
    }
    const referencePlaceholders = placeholdersIn(reference.name, key, referenceText, problems);
    const translationPlaceholders = placeholdersIn(
      translation.name,
      key,
      translationText,
      problems,
    );
    if (referencePlaceholders === null || translationPlaceholders === null) {
      continue;
    }
    if (referencePlaceholders.join('|') !== translationPlaceholders.join('|')) {
      problems.push(
        `"${key}": placeholders differ: ${reference.name} has ${describe(referencePlaceholders)}, ` +
          `${translation.name} has ${describe(translationPlaceholders)}`,
      );
    }
  }
  return problems;
}

function placeholdersIn(
  fileName: string,
  key: string,
  text: string,
  problems: string[],
): string[] | null {
  try {
    return placeholdersOf(text);
  } catch (error) {
    problems.push(`${fileName}: "${key}" is not a valid ICU message: ${(error as Error).message}`);
    return null;
  }
}

function describe(placeholders: string[]): string {
  return placeholders.length === 0 ? 'none' : placeholders.map((p) => `{${p}}`).join(' ');
}

/** Reads one messages file from the app's messages/ folder. */
export function readMessageFile(locale: string): MessageFile {
  const name = `messages/${locale}.json`;
  const appFolder = join(dirname(fileURLToPath(import.meta.url)), '..');
  return { name, content: JSON.parse(readFileSync(join(appFolder, name), 'utf8')) as unknown };
}

/** Compares the Arabic file against the English one, which is the reference. */
export function checkAppMessages(): string[] {
  return compareMessages(readMessageFile('en'), readMessageFile('ar'));
}

if (import.meta.main) {
  const problems = checkAppMessages();
  if (problems.length > 0) {
    console.error(`i18n:check found ${problems.length} problem(s):`);
    for (const problem of problems) {
      console.error(`  - ${problem}`);
    }
    process.exitCode = 1;
  } else {
    const count = flattenMessages(readMessageFile('en').content).size;
    console.log(
      `i18n:check: ${count} keys, the same in English and Arabic, with the same placeholders.`,
    );
  }
}
